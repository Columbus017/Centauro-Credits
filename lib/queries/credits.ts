import 'server-only'

import { db } from '@/lib/db'
import { fromDbAmount, fromDbDate, fromDbDateOrNull, isoDate } from '@/lib/db-utils'
import {
  fromCents,
  outstandingCents,
  payoffTotalCents,
  toCents,
  type LedgerRow,
} from '@/lib/ledger'
import { daysBetween } from '@/lib/format'
import { today } from '@/lib/clock'
import type { Status } from '@/components/status-badge'

/**
 * A credit with everything the screens show, derived rather than read.
 *
 * `outstanding`, `status` and the payment tallies come from walking the ledger
 * through `lib/ledger.ts`, not from `ledger_entries.running_balance`. The
 * denormalised column exists for the ETL to check itself against, and Phase 2
 * proved the legacy values drift; the derivation is the tested one, and it
 * keeps the list and the detail screen from ever disagreeing.
 */
export type CreditRow = {
  id: number
  customerId: number
  collectorId: number
  code: string
  startDate: string
  principal: number
  interestRate: number
  totalDue: number
  outstanding: number
  paymentCount: number
  lastPaymentDate: string | null
  cancelledAt: string | null
  badRecord: boolean
  status: Status
  customerName: string
  collectorName: string
  routeName: string
  commerceName: string
}

/** The joins every credit projection needs. */
const creditInclude = {
  customer: { include: { route: true, commerce: true } },
  collector: true,
  ledgerEntries: {
    where: { deletedAt: null },
    // Ledger order, not date order: back-dated payments exist, and the legacy
    // app posts and re-derives by `idBalance ASC`.
    orderBy: { id: 'asc' },
  },
} as const

type CreditWithRelations = Awaited<
  ReturnType<typeof db.credit.findFirstOrThrow<{ include: typeof creditInclude }>>
>

function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`
}

/** The ledger rows of one credit, in the shape `lib/ledger.ts` walks. */
function toLedgerRows(credit: CreditWithRelations): (LedgerRow & { entryDate: string })[] {
  return credit.ledgerEntries.map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    amountCents: toCents(entry.amount.toString()),
    voided: entry.voidedAt !== null,
    entryDate: fromDbDate(entry.entryDate),
  }))
}

function projectCredit(credit: CreditWithRelations): CreditRow {
  const rows = toLedgerRows(credit)
  const payments = rows.filter((row) => row.kind === 'payment' && !row.voided)

  const cancelledAt = fromDbDateOrNull(credit.cancelledAt)
  const status: Status = credit.badRecord
    ? 'badRecord'
    : cancelledAt
      ? 'cancelled'
      : 'active'

  return {
    id: credit.id,
    customerId: credit.customerId,
    collectorId: credit.collectorId,
    code: credit.code,
    startDate: fromDbDate(credit.startDate),
    principal: fromDbAmount(credit.principal),
    interestRate: fromDbAmount(credit.interestRate),
    totalDue: fromCents(
      payoffTotalCents(credit.principal.toString(), credit.interestRate.toString()),
    ),
    outstanding: fromCents(outstandingCents(rows)),
    paymentCount: payments.length,
    lastPaymentDate: payments.at(-1)?.entryDate ?? null,
    cancelledAt,
    badRecord: credit.badRecord,
    status,
    customerName: fullName(credit.customer),
    collectorName: fullName(credit.collector),
    routeName: credit.customer.route?.name ?? '—',
    commerceName: credit.customer.commerce?.name ?? '—',
  }
}

/**
 * Restricts a query to one collector's book.
 *
 * `null` means "everything", which only an admin ever passes. Every caller
 * that serves a collector must thread their own `collectorId` through here —
 * this is the row-level half of the authorization Phase 3 put in place at the
 * route level.
 */
export type Scope = { collectorId: number | null }

function scopeWhere({ collectorId }: Scope) {
  return collectorId === null ? {} : { collectorId }
}

export async function listCredits(
  scope: Scope,
  filter: {
    status?: 'active' | 'cancelled' | 'badRecord'
    customerId?: number
    /**
     * Credits paid off within a closed date range, for the *Créditos
     * terminados* report.
     *
     * Selection reads the stored `cancelled_at` while every figure the report
     * shows is still derived. The column is written by `syncCredit()` from the
     * same `payoffState()` the projection uses, so the two agree by
     * construction — and doing the range in SQL is what keeps the report from
     * walking the ledger of every credit the collector ever wrote.
     */
    cancelledBetween?: { from: string; to: string }
  } = {},
) {
  const credits = await db.credit.findMany({
    where: {
      deletedAt: null,
      ...scopeWhere(scope),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.status === 'active' ? { cancelledAt: null } : {}),
      ...(filter.status === 'cancelled' ? { cancelledAt: { not: null }, badRecord: false } : {}),
      ...(filter.status === 'badRecord' ? { badRecord: true } : {}),
      ...(filter.cancelledBetween
        ? {
            cancelledAt: {
              gte: isoDate(filter.cancelledBetween.from),
              lte: isoDate(filter.cancelledBetween.to),
            },
          }
        : {}),
    },
    include: creditInclude,
    orderBy: { code: 'asc' },
  })

  return credits.map(projectCredit)
}

export async function getCredit(id: number, scope: Scope) {
  const credit = await db.credit.findFirst({
    where: { id, deletedAt: null, ...scopeWhere(scope) },
    include: creditInclude,
  })

  return credit ? projectCredit(credit) : null
}

export type LedgerEntryRow = {
  id: number
  kind: 'origination' | 'payment'
  entryDate: string
  amount: number
  runningBalance: number
  voided: boolean
}

/** One credit's statement, newest first — the order the detail screen shows. */
export async function getCreditLedger(creditId: number): Promise<LedgerEntryRow[]> {
  const entries = await db.ledgerEntry.findMany({
    where: { creditId, deletedAt: null },
    orderBy: { id: 'asc' },
  })

  return entries
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      entryDate: fromDbDate(entry.entryDate),
      amount: fromDbAmount(entry.amount),
      runningBalance: fromDbAmount(entry.runningBalance),
      voided: entry.voidedAt !== null,
    }))
    .reverse()
}

/**
 * Days since a live credit last took money — the nearest thing the legacy data
 * supports to a delinquency measure. Credits that never paid are counted from
 * the day they were handed over.
 */
export function daysSincePayment(credit: CreditRow, asOf = today()) {
  return daysBetween(credit.lastPaymentDate ?? credit.startDate, asOf)
}

/** What a client still owes across all of their credits. */
export async function customerBalance(customerId: number) {
  const credits = await listCredits({ collectorId: null }, { customerId })
  return credits.reduce((sum, credit) => sum + credit.outstanding, 0)
}
