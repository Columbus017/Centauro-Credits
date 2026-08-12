import 'server-only'

import { db } from '@/lib/db'
import { fromDbDate, isoDate } from '@/lib/db-utils'
import { fromCents, toCents, GOOD_RECORD_DAYS } from '@/lib/ledger'
import { monthOf, recentMonths, today } from '@/lib/clock'
import { daysSincePayment, listCredits, type CreditRow } from '@/lib/queries/credits'
import { listCollectors } from '@/lib/queries/entities'

/** How much history the trend and cash-flow charts show. */
const TREND_MONTHS = 6

/** The first day of the earliest month in a `recentMonths()` window. */
function windowStart(months: string[]) {
  return isoDate(`${months[0]}-01`)
}

// --------------------------------------------------------------------- KPIs

export type PortfolioKpi = {
  key: 'outstanding' | 'collected' | 'delinquency' | 'activeCredits'
  value: number
  delta?: number
  trend?: 'up' | 'down'
  currency?: boolean
  percent?: boolean
}

/**
 * The four headline figures.
 *
 * The design showed a period-over-period delta on every tile. Only *collected*
 * can honestly carry one: it is a flow, so this month and last month are both
 * in the ledger. Outstanding, delinquency and the active count are stocks, and
 * nothing records what they were a month ago — the mock data's deltas were
 * invented, and inventing them against real money would be worse.
 */
export async function portfolioKpis(asOf = today()): Promise<PortfolioKpi[]> {
  const credits = await listCredits({ collectorId: null }, { status: 'active' })

  const outstandingCentsTotal = credits.reduce(
    (sum, credit) => sum + toCents(credit.outstanding),
    0,
  )

  const [collectedThis, collectedLast] = await Promise.all([
    collectedInMonth(monthOf(asOf)),
    collectedInMonth(previousMonth(monthOf(asOf))),
  ])

  const delinquent = credits.filter(
    (credit) => daysSincePayment(credit, asOf) > GOOD_RECORD_DAYS,
  )
  const delinquencyRate = credits.length
    ? Math.round((delinquent.length / credits.length) * 1000) / 10
    : 0

  const delta =
    collectedLast > 0
      ? Math.round(((collectedThis - collectedLast) / collectedLast) * 1000) / 10
      : undefined

  return [
    { key: 'outstanding', value: fromCents(outstandingCentsTotal), currency: true },
    {
      key: 'collected',
      value: fromCents(collectedThis),
      currency: true,
      ...(delta === undefined
        ? {}
        : { delta: Math.abs(delta), trend: delta >= 0 ? ('up' as const) : ('down' as const) }),
    },
    { key: 'delinquency', value: delinquencyRate, percent: true },
    { key: 'activeCredits', value: credits.length },
  ]
}

function previousMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7)
}

/** Non-voided payments booked in a `YYYY-MM`, in centavos. */
async function collectedInMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to = new Date(Date.UTC(year, month, 1))

  const entries = await db.ledgerEntry.findMany({
    where: {
      kind: 'payment',
      deletedAt: null,
      voidedAt: null,
      entryDate: { gte: from, lt: to },
      credit: { deletedAt: null },
    },
    select: { amount: true },
  })

  return entries.reduce((sum, entry) => sum + toCents(entry.amount.toString()), 0)
}

// ------------------------------------------------------------------- trends

export type TrendPoint = { month: string; disbursed: number; collected: number }

/**
 * Capital handed out against cash recovered, by month.
 *
 * Disbursed is the principal of credits *started* in the month, which is what
 * `newIncome.php` totals into `income.credits`; collected is the ledger.
 */
export async function monthlyTrend(asOf = today()): Promise<TrendPoint[]> {
  const months = recentMonths(TREND_MONTHS, asOf)
  const from = windowStart(months)

  const [credits, payments] = await Promise.all([
    db.credit.findMany({
      where: { deletedAt: null, startDate: { gte: from } },
      select: { startDate: true, principal: true },
    }),
    db.ledgerEntry.findMany({
      where: {
        kind: 'payment',
        deletedAt: null,
        voidedAt: null,
        entryDate: { gte: from },
        credit: { deletedAt: null },
      },
      select: { entryDate: true, amount: true },
    }),
  ])

  const disbursed = sumByMonth(credits, (row) => row.startDate, (row) => row.principal)
  const collected = sumByMonth(payments, (row) => row.entryDate, (row) => row.amount)

  return months.map((month) => ({
    month,
    disbursed: fromCents(disbursed.get(month) ?? 0),
    collected: fromCents(collected.get(month) ?? 0),
  }))
}

export type CashFlowPoint = {
  month: string
  base: number
  collected: number
  surplus: number
  disbursed: number
}

/**
 * The old `dash*.php` charts, which were four near-identical queries over
 * `income` — one per column — plus `dashCash.php` for the derived total. One
 * pass over `daily_closes` replaces all five.
 */
export async function monthlyCashFlow(asOf = today()): Promise<CashFlowPoint[]> {
  const months = recentMonths(TREND_MONTHS, asOf)

  const closes = await db.dailyClose.findMany({
    where: { closeDate: { gte: windowStart(months) } },
    select: {
      closeDate: true,
      base: true,
      collected: true,
      surplus: true,
      disbursed: true,
    },
  })

  const base = sumByMonth(closes, (row) => row.closeDate, (row) => row.base)
  const collected = sumByMonth(closes, (row) => row.closeDate, (row) => row.collected)
  const surplus = sumByMonth(closes, (row) => row.closeDate, (row) => row.surplus)
  const disbursed = sumByMonth(closes, (row) => row.closeDate, (row) => row.disbursed)

  return months.map((month) => ({
    month,
    base: fromCents(base.get(month) ?? 0),
    collected: fromCents(collected.get(month) ?? 0),
    surplus: fromCents(surplus.get(month) ?? 0),
    disbursed: fromCents(disbursed.get(month) ?? 0),
  }))
}

/** Totals a decimal column per `YYYY-MM`, in centavos. */
function sumByMonth<T>(
  rows: T[],
  dateOf: (row: T) => Date,
  amountOf: (row: T) => { toString(): string },
) {
  const totals = new Map<string, number>()

  for (const row of rows) {
    const month = monthOf(fromDbDate(dateOf(row)))
    totals.set(month, (totals.get(month) ?? 0) + toCents(amountOf(row).toString()))
  }

  return totals
}

// ------------------------------------------------------- collector standing

export type CollectorPerformance = {
  collectorId: number
  name: string
  clients: number
  activeCredits: number
  portfolio: number
  collected: number
}

/** The standings table: active collectors, best recovery first. */
export async function collectorPerformance(): Promise<CollectorPerformance[]> {
  const collectors = await listCollectors()

  return collectors
    .filter((collector) => collector.active)
    .map((collector) => ({
      collectorId: collector.id,
      name: collector.name,
      clients: collector.clients,
      activeCredits: collector.activeCredits,
      portfolio: collector.portfolio,
      collected: collector.collected,
    }))
    .sort((a, b) => b.collected - a.collected)
}

// -------------------------------------------------------------- delinquency

export type AgingBucket = {
  key: 'current' | 'd1to30' | 'd31to60' | 'd60plus'
  credits: number
  amount: number
}

/** Live credits bucketed by days since their last payment. */
export function agingBuckets(credits: CreditRow[], asOf = today()): AgingBucket[] {
  const buckets: Record<AgingBucket['key'], AgingBucket> = {
    current: { key: 'current', credits: 0, amount: 0 },
    d1to30: { key: 'd1to30', credits: 0, amount: 0 },
    d31to60: { key: 'd31to60', credits: 0, amount: 0 },
    d60plus: { key: 'd60plus', credits: 0, amount: 0 },
  }

  for (const credit of credits) {
    const days = daysSincePayment(credit, asOf)
    const key: AgingBucket['key'] =
      days <= 7 ? 'current' : days <= 30 ? 'd1to30' : days <= 60 ? 'd31to60' : 'd60plus'
    buckets[key].credits += 1
    buckets[key].amount = fromCents(
      toCents(buckets[key].amount) + toCents(credit.outstanding),
    )
  }

  return Object.values(buckets)
}

/** Live credits that have not paid inside the grace window. */
export function delinquentCredits(credits: CreditRow[], asOf = today()) {
  return credits.filter((credit) => daysSincePayment(credit, asOf) > GOOD_RECORD_DAYS)
}

// -------------------------------------------------------------- login panel

/**
 * The two figures the login screen shows before anyone has signed in.
 *
 * Deliberately the only unauthenticated read in the app, and deliberately
 * aggregate: a recovery rate and a rounded portfolio total name no client.
 */
export async function publicHeadline() {
  const credits = await listCredits({ collectorId: null }, { status: 'active' })
  const outstanding = credits.reduce((sum, credit) => sum + toCents(credit.outstanding), 0)
  const delinquent = delinquentCredits(credits)

  return {
    outstanding: fromCents(outstanding),
    collectionRate: credits.length
      ? Math.round((1 - delinquent.length / credits.length) * 1000) / 10
      : 100,
  }
}
