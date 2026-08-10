/**
 * Placeholder data for the Centauro console, shaped like the PostgreSQL schema
 * that Phase 2 introduces so swapping in Prisma reads stays mechanical.
 *
 * The domain rules encoded here are the real ones from the legacy PHP app:
 * a credit's payoff total is `principal * (1 + interestRate)` with a flat 15%
 * rate, payments form an append-only ledger whose first row is the
 * origination, a credit is cancelled once its balance reaches zero, and it is
 * flagged `badRecord` when payoff took more than 30 days.
 */

import { daysBetween } from '@/lib/format'
import type { Status } from '@/components/status-badge'

export const INTEREST_RATE = 0.15

/** Payoff is graced for 30 days; beyond that the client gets a bad record. */
export const GOOD_RECORD_DAYS = 30

// ---------------------------------------------------------------- entities

export type Commerce = { id: number; name: string; active: boolean }

export const commerce: Commerce[] = [
  { id: 1, name: 'Mercado Central', active: true },
  { id: 2, name: 'Mercado La Terminal', active: true },
  { id: 3, name: 'Mercado Villa Nueva', active: true },
  { id: 4, name: 'Centro Comercial Mixco', active: true },
  { id: 5, name: 'Mercado El Guarda', active: true },
]

export type Collector = {
  id: number
  firstName: string
  lastName: string
  dpi: string
  mobile: string
  address: string
  birthDate: string
  active: boolean
}

export const collectors: Collector[] = [
  { id: 1, firstName: 'Carlos', lastName: 'Mejía', dpi: '1874 55201 0101', mobile: '5512 8834', address: '12 calle 4-52, Zona 1, Guatemala', birthDate: '1985-03-14', active: true },
  { id: 2, firstName: 'Ana Lucía', lastName: 'Pérez', dpi: '2043 77120 0108', mobile: '4471 2290', address: '6a avenida 8-19, Zona 3, Guatemala', birthDate: '1990-08-02', active: true },
  { id: 3, firstName: 'Erick', lastName: 'Ramírez', dpi: '1955 38810 0104', mobile: '3338 1104', address: '3a calle 12-08, Villa Nueva', birthDate: '1988-11-19', active: true },
  { id: 4, firstName: 'Silvia', lastName: 'Morales', dpi: '2211 90244 0107', mobile: '5902 4457', address: '7a avenida 2-31, Mixco', birthDate: '1992-01-27', active: true },
  { id: 5, firstName: 'Byron', lastName: 'Castillo', dpi: '1788 11902 0103', mobile: '4118 9023', address: '5a calle 9-14, Amatitlán', birthDate: '1983-09-11', active: false },
]

export type Route = {
  id: number
  code: string
  name: string
  details: string
  collectorId: number | null
  active: boolean
}

export const routes: Route[] = [
  { id: 1, code: 'R-01', name: 'Zona 1 Centro', details: 'Casco histórico y alrededores del Mercado Central', collectorId: 1, active: true },
  { id: 2, code: 'R-02', name: 'La Terminal', details: 'Zona 4, sector del mercado mayorista', collectorId: 2, active: true },
  { id: 3, code: 'R-03', name: 'Villa Nueva', details: 'Casco central de Villa Nueva y Bárcenas', collectorId: 3, active: true },
  { id: 4, code: 'R-04', name: 'Mixco', details: 'San Cristóbal y Ciudad San Cristóbal', collectorId: 4, active: true },
  { id: 5, code: 'R-05', name: 'Zona 18', details: 'Atlántida y colonias aledañas', collectorId: 1, active: true },
  { id: 6, code: 'R-06', name: 'Amatitlán', details: 'Ruta suspendida temporalmente', collectorId: null, active: false },
]

export type Customer = {
  id: number
  commerceId: number
  routeId: number
  dpi: string
  firstName: string
  lastName: string
  address: string
  mobile: string
  mobile2: string
  active: boolean
  createdAt: string
}

export const customers: Customer[] = [
  { id: 1, commerceId: 1, routeId: 1, dpi: '2312 44890 0101', firstName: 'Rosa', lastName: 'Martínez', address: 'Local 42, Mercado Central, Zona 1', mobile: '5812 3390', mobile2: '2232 1180', active: true, createdAt: '2022-04-11' },
  { id: 2, commerceId: 2, routeId: 2, dpi: '1998 71230 0104', firstName: 'Jorge', lastName: 'Wittfield', address: 'Bodega 8, La Terminal, Zona 4', mobile: '4471 1180', mobile2: '', active: true, createdAt: '2021-12-03' },
  { id: 3, commerceId: 3, routeId: 3, dpi: '2455 09912 0107', firstName: 'Lucía', lastName: 'Chen', address: '5a calle 3-17, Villa Nueva', mobile: '2296 6654', mobile2: '5590 0021', active: true, createdAt: '2020-07-22' },
  { id: 4, commerceId: 4, routeId: 4, dpi: '2103 55471 0102', firstName: 'Omar', lastName: 'Hernández', address: '21 avenida 4-09, San Cristóbal, Mixco', mobile: '5903 2218', mobile2: '', active: true, createdAt: '2023-02-15' },
  { id: 5, commerceId: 5, routeId: 5, dpi: '1877 33021 0109', firstName: 'Beatriz', lastName: 'Gómez', address: 'Puesto 17, Mercado El Guarda, Zona 18', mobile: '5654 9902', mobile2: '2245 7781', active: true, createdAt: '2022-10-08' },
  { id: 6, commerceId: 3, routeId: 3, dpi: '2288 10045 0103', firstName: 'Kevin', lastName: 'Paredes', address: '2a avenida 11-22, Bárcenas, Villa Nueva', mobile: '5771 3345', mobile2: '', active: true, createdAt: '2021-05-19' },
  { id: 7, commerceId: 1, routeId: 1, dpi: '2390 88104 0106', firstName: 'Nadia', lastName: 'Ralda', address: 'Local 118, Mercado Central, Zona 1', mobile: '5208 7741', mobile2: '', active: true, createdAt: '2023-01-30' },
  { id: 8, commerceId: 5, routeId: 5, dpi: '2011 45590 0105', firstName: 'Samuel', lastName: 'Aceituno', address: '9a calle 5-40, Zona 18', mobile: '5512 0098', mobile2: '2298 3312', active: true, createdAt: '2022-08-14' },
  { id: 9, commerceId: 2, routeId: 2, dpi: '1966 22781 0108', firstName: 'Carla', lastName: 'Mendoza', address: 'Bodega 31, La Terminal, Zona 4', mobile: '5349 8820', mobile2: '', active: true, createdAt: '2020-03-06' },
  { id: 10, commerceId: 4, routeId: 4, dpi: '2144 66330 0101', firstName: 'Tomás', lastName: 'Ixcot', address: '14 calle 2-55, Ciudad San Cristóbal', mobile: '5662 4417', mobile2: '', active: true, createdAt: '2019-09-25' },
  { id: 11, commerceId: 1, routeId: 1, dpi: '2377 91002 0102', firstName: 'Elena', lastName: 'Sicán', address: 'Local 61, Mercado Central, Zona 1', mobile: '4408 2219', mobile2: '', active: true, createdAt: '2023-06-02' },
  { id: 12, commerceId: 2, routeId: 2, dpi: '1902 30045 0109', firstName: 'Mario', lastName: 'Quiñónez', address: 'Bodega 4, La Terminal, Zona 4', mobile: '5170 6634', mobile2: '', active: false, createdAt: '2018-11-12' },
]

// ------------------------------------------------------------------ credits

type CreditSeed = {
  id: number
  customerId: number
  collectorId: number
  /** The client's card number — `credit.code` in the legacy schema. */
  code: string
  startDate: string
  principal: number
  payments: { date: string; amount: number; voided?: boolean }[]
}

const creditSeeds: CreditSeed[] = [
  {
    id: 1, customerId: 1, collectorId: 1, code: 'T-1042', startDate: '2024-04-08', principal: 1500,
    payments: [
      { date: '2024-04-15', amount: 200 },
      { date: '2024-04-22', amount: 200 },
      { date: '2024-04-29', amount: 200 },
      { date: '2024-05-13', amount: 200 },
      { date: '2024-05-27', amount: 200 },
    ],
  },
  // Stale since early April — lands in the 31–60 day aging bucket.
  {
    id: 2, customerId: 2, collectorId: 2, code: 'T-1043', startDate: '2024-03-11', principal: 4000,
    payments: [
      { date: '2024-03-18', amount: 400 },
      { date: '2024-03-25', amount: 400 },
      { date: '2024-04-01', amount: 400 },
    ],
  },
  // Paid off in 25 days — cancelled with a clean record.
  {
    id: 3, customerId: 3, collectorId: 3, code: 'T-1044', startDate: '2024-02-05', principal: 2200,
    payments: [
      { date: '2024-02-12', amount: 700 },
      { date: '2024-02-19', amount: 700 },
      { date: '2024-02-26', amount: 700 },
      { date: '2024-03-01', amount: 430 },
    ],
  },
  {
    id: 4, customerId: 4, collectorId: 4, code: 'T-1045', startDate: '2024-01-15', principal: 6000,
    payments: [
      { date: '2024-01-22', amount: 500 },
      { date: '2024-02-05', amount: 500 },
      { date: '2024-03-04', amount: 500 },
      { date: '2024-04-15', amount: 500 },
      { date: '2024-05-20', amount: 500 },
    ],
  },
  {
    id: 5, customerId: 5, collectorId: 1, code: 'T-1046', startDate: '2024-05-06', principal: 1000,
    payments: [
      { date: '2024-05-13', amount: 150 },
      { date: '2024-05-20', amount: 150 },
      { date: '2024-05-27', amount: 150 },
    ],
  },
  {
    id: 6, customerId: 6, collectorId: 3, code: 'T-1047', startDate: '2024-04-22', principal: 2500,
    payments: [
      { date: '2024-04-29', amount: 300 },
      { date: '2024-05-06', amount: 300 },
      { date: '2024-05-13', amount: 300 },
      { date: '2024-05-27', amount: 300 },
    ],
  },
  // Carries a voided payment so the ledger's "anulado" state is visible.
  {
    id: 7, customerId: 7, collectorId: 1, code: 'T-1048', startDate: '2024-03-25', principal: 1800,
    payments: [
      { date: '2024-04-01', amount: 250 },
      { date: '2024-04-08', amount: 250, voided: true },
      { date: '2024-04-15', amount: 250 },
      { date: '2024-05-22', amount: 250 },
    ],
  },
  {
    id: 8, customerId: 8, collectorId: 1, code: 'T-1049', startDate: '2024-05-20', principal: 800,
    payments: [{ date: '2024-05-27', amount: 120 }],
  },
  // Abandoned since January — the worst account on the book.
  {
    id: 9, customerId: 9, collectorId: 2, code: 'T-1050', startDate: '2023-12-04', principal: 6500,
    payments: [
      { date: '2023-12-11', amount: 600 },
      { date: '2023-12-18', amount: 600 },
      { date: '2024-01-08', amount: 600 },
    ],
  },
  {
    id: 10, customerId: 10, collectorId: 4, code: 'T-1051', startDate: '2024-01-08', principal: 3000,
    payments: [
      { date: '2024-01-15', amount: 900 },
      { date: '2024-01-22', amount: 900 },
      { date: '2024-01-29', amount: 900 },
      { date: '2024-02-02', amount: 750 },
    ],
  },
  // Just disbursed, no payments yet.
  {
    id: 11, customerId: 11, collectorId: 1, code: 'T-1052', startDate: '2024-05-27', principal: 1200,
    payments: [],
  },
  // Paid off, but took 70 days — flagged as a bad record.
  {
    id: 12, customerId: 6, collectorId: 3, code: 'T-1039', startDate: '2023-10-02', principal: 1500,
    payments: [
      { date: '2023-10-23', amount: 575 },
      { date: '2023-11-20', amount: 575 },
      { date: '2023-12-11', amount: 575 },
    ],
  },
  {
    id: 13, customerId: 3, collectorId: 3, code: 'T-1053', startDate: '2024-05-06', principal: 2000,
    payments: [
      { date: '2024-05-13', amount: 250 },
      { date: '2024-05-20', amount: 250 },
      { date: '2024-05-27', amount: 250 },
    ],
  },
  {
    id: 14, customerId: 10, collectorId: 4, code: 'T-1054', startDate: '2024-04-15', principal: 3500,
    payments: [
      { date: '2024-04-22', amount: 400 },
      { date: '2024-04-29', amount: 400 },
      { date: '2024-05-13', amount: 400 },
    ],
  },
]

export type LedgerEntry = {
  id: number
  creditId: number
  entryDate: string
  kind: 'origination' | 'payment'
  amount: number
  /** Balance owed after this entry, ignoring voided rows. */
  runningBalance: number
  voided: boolean
}

export type Credit = {
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
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * Rebuilds a credit and its ledger from a seed, applying the same rules the
 * server will: origination row first, running balance recomputed over
 * non-voided payments only, payoff detection and the 30-day record flag.
 */
function buildCredit(seed: CreditSeed, nextEntryId: () => number) {
  const totalDue = round2(seed.principal * (1 + INTEREST_RATE))

  const entries: LedgerEntry[] = [
    {
      id: nextEntryId(),
      creditId: seed.id,
      entryDate: seed.startDate,
      kind: 'origination',
      amount: totalDue,
      runningBalance: totalDue,
      voided: false,
    },
  ]

  let balance = totalDue
  let lastPaymentDate: string | null = null
  let paymentCount = 0

  for (const payment of seed.payments) {
    const voided = payment.voided ?? false
    if (!voided) {
      balance = round2(balance - payment.amount)
      lastPaymentDate = payment.date
      paymentCount += 1
    }
    entries.push({
      id: nextEntryId(),
      creditId: seed.id,
      entryDate: payment.date,
      kind: 'payment',
      amount: payment.amount,
      runningBalance: balance,
      voided,
    })
  }

  const paidOff = balance <= 0
  const cancelledAt = paidOff ? lastPaymentDate : null
  const badRecord =
    paidOff && cancelledAt
      ? daysBetween(seed.startDate, cancelledAt) > GOOD_RECORD_DAYS
      : false

  const credit: Credit = {
    id: seed.id,
    customerId: seed.customerId,
    collectorId: seed.collectorId,
    code: seed.code,
    startDate: seed.startDate,
    principal: seed.principal,
    interestRate: INTEREST_RATE,
    totalDue,
    outstanding: Math.max(balance, 0),
    paymentCount,
    lastPaymentDate,
    cancelledAt,
    badRecord,
    status: badRecord ? 'badRecord' : paidOff ? 'cancelled' : 'active',
  }

  return { credit, entries }
}

const built = (() => {
  let entryId = 0
  const nextEntryId = () => (entryId += 1)
  const credits: Credit[] = []
  const ledgerEntries: LedgerEntry[] = []

  for (const seed of creditSeeds) {
    const { credit, entries } = buildCredit(seed, nextEntryId)
    credits.push(credit)
    ledgerEntries.push(...entries)
  }

  return { credits, ledgerEntries }
})()

export const credits = built.credits
export const ledgerEntries = built.ledgerEntries

// -------------------------------------------------------------- daily close

export type DailyClose = {
  id: number
  collectorId: number
  closeDate: string
  /** Cash collected from clients that day (`income.incomes`). */
  collected: number
  /** Float the collector starts the day with (`income.base`). */
  base: number
  /** Cash handed back over the base (`income.exes`). */
  surplus: number
  /** Cash paid out as new credits that day (`income.credits`). */
  disbursed: number
}

export const dailyCloses: DailyClose[] = [
  { id: 1, collectorId: 1, closeDate: '2024-05-27', collected: 4820, base: 1500, surplus: 620, disbursed: 2700 },
  { id: 2, collectorId: 2, closeDate: '2024-05-27', collected: 3910, base: 1200, surplus: 410, disbursed: 1800 },
  { id: 3, collectorId: 3, closeDate: '2024-05-27', collected: 5240, base: 1500, surplus: 740, disbursed: 3200 },
  { id: 4, collectorId: 4, closeDate: '2024-05-27', collected: 2980, base: 1000, surplus: 280, disbursed: 1500 },
  { id: 5, collectorId: 1, closeDate: '2024-05-26', collected: 4410, base: 1500, surplus: 510, disbursed: 2200 },
  { id: 6, collectorId: 2, closeDate: '2024-05-26', collected: 3620, base: 1200, surplus: 320, disbursed: 2000 },
  { id: 7, collectorId: 3, closeDate: '2024-05-26', collected: 4870, base: 1500, surplus: 670, disbursed: 2800 },
  { id: 8, collectorId: 4, closeDate: '2024-05-26', collected: 3140, base: 1000, surplus: 340, disbursed: 1200 },
]

/** `(base + collected) - (disbursed + surplus)` — the legacy dashboard's cash figure. */
export function closeCash(close: DailyClose) {
  return close.base + close.collected - (close.disbursed + close.surplus)
}

// -------------------------------------------------------------------- users

export type User = {
  id: number
  collectorId: number | null
  firstName: string
  lastName: string
  username: string
  role: 'admin' | 'collector'
  active: boolean
  lastActiveLabel: string
}

export const users: User[] = [
  { id: 1, collectorId: null, firstName: 'Marlon', lastName: 'Véliz', username: 'mveliz', role: 'admin', active: true, lastActiveLabel: '2 min' },
  { id: 2, collectorId: 1, firstName: 'Carlos', lastName: 'Mejía', username: 'cmejia', role: 'collector', active: true, lastActiveLabel: '1 h' },
  { id: 3, collectorId: 2, firstName: 'Ana Lucía', lastName: 'Pérez', username: 'aperez', role: 'collector', active: true, lastActiveLabel: '3 h' },
  { id: 4, collectorId: 3, firstName: 'Erick', lastName: 'Ramírez', username: 'eramirez', role: 'collector', active: true, lastActiveLabel: '5 h' },
  { id: 5, collectorId: 5, firstName: 'Byron', lastName: 'Castillo', username: 'bcastillo', role: 'collector', active: false, lastActiveLabel: '3 sem' },
]

// -------------------------------------------------------------- projections

export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`
}

export function collectorById(id: number | null) {
  return collectors.find((c) => c.id === id) ?? null
}

export function routeById(id: number | null) {
  return routes.find((r) => r.id === id) ?? null
}

export function customerById(id: number) {
  return customers.find((c) => c.id === id) ?? null
}

export function commerceById(id: number) {
  return commerce.find((c) => c.id === id) ?? null
}

export function creditById(id: number) {
  return credits.find((c) => c.id === id) ?? null
}

export function entriesForCredit(creditId: number) {
  return ledgerEntries.filter((e) => e.creditId === creditId)
}

export function creditsForCustomer(customerId: number) {
  return credits.filter((c) => c.customerId === customerId)
}

export function creditsForCollector(collectorId: number) {
  return credits.filter((c) => c.collectorId === collectorId)
}

export function customersForRoute(routeId: number) {
  return customers.filter((c) => c.routeId === routeId)
}

/** A credit joined to the names every list screen needs. */
export type CreditRow = Credit & {
  customerName: string
  collectorName: string
  routeName: string
  commerceName: string
}

export function creditRows(source: Credit[] = credits): CreditRow[] {
  return source.map((credit) => {
    const customer = customerById(credit.customerId)
    const route = customer ? routeById(customer.routeId) : null
    const business = customer ? commerceById(customer.commerceId) : null
    const collector = collectorById(credit.collectorId)

    return {
      ...credit,
      customerName: customer ? fullName(customer) : '—',
      collectorName: collector ? fullName(collector) : '—',
      routeName: route?.name ?? '—',
      commerceName: business?.name ?? '—',
    }
  })
}

/** Outstanding balance a client owes across every one of their credits. */
export function customerBalance(customerId: number) {
  return creditsForCustomer(customerId).reduce((sum, c) => sum + c.outstanding, 0)
}

export type PaymentRow = {
  id: number
  creditId: number
  creditCode: string
  customerName: string
  collectorName: string
  routeName: string
  date: string
  amount: number
  runningBalance: number
  voided: boolean
}

/** Every posted payment, newest first — the `/payments` ledger view. */
export function paymentRows(): PaymentRow[] {
  return ledgerEntries
    .filter((entry) => entry.kind === 'payment')
    .map((entry) => {
      const credit = creditById(entry.creditId)
      const customer = credit ? customerById(credit.customerId) : null
      const collector = credit ? collectorById(credit.collectorId) : null
      const route = customer ? routeById(customer.routeId) : null

      return {
        id: entry.id,
        creditId: entry.creditId,
        creditCode: credit?.code ?? '—',
        customerName: customer ? fullName(customer) : '—',
        collectorName: collector ? fullName(collector) : '—',
        routeName: route?.name ?? '—',
        date: entry.entryDate,
        amount: entry.amount,
        runningBalance: entry.runningBalance,
        voided: entry.voided,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

export function paymentById(id: number) {
  return paymentRows().find((p) => p.id === id) ?? null
}

// ------------------------------------------------------------ dashboard data

const activeCredits = credits.filter((c) => c.cancelledAt === null)

/** Total still owed across the live book. */
export const outstandingTotal = round2(
  activeCredits.reduce((sum, c) => sum + c.outstanding, 0),
)

/** Capital placed on the street — `SUM(total) WHERE cancel = 0` in the old app. */
export const capitalTotal = round2(
  activeCredits.reduce((sum, c) => sum + c.principal, 0),
)

export const collectedTotal = round2(
  ledgerEntries
    .filter((e) => e.kind === 'payment' && !e.voided)
    .reduce((sum, e) => sum + e.amount, 0),
)

/**
 * Days since the last payment on a live credit — the closest thing the legacy
 * data supports to a delinquency measure.
 */
const AS_OF = '2024-05-28'

export function daysSincePayment(credit: Credit) {
  return daysBetween(credit.lastPaymentDate ?? credit.startDate, AS_OF)
}

export const delinquentCredits = activeCredits.filter(
  (c) => daysSincePayment(c) > GOOD_RECORD_DAYS,
)

export const delinquencyRate = activeCredits.length
  ? round2((delinquentCredits.length / activeCredits.length) * 100)
  : 0

export const portfolioKpis = [
  { key: 'outstanding', value: outstandingTotal, delta: 6.4, trend: 'up' as const, currency: true },
  { key: 'collected', value: collectedTotal, delta: 3.1, trend: 'up' as const, currency: true },
  { key: 'delinquency', value: delinquencyRate, delta: -0.8, trend: 'down' as const, percent: true },
  { key: 'activeCredits', value: activeCredits.length, delta: 2.2, trend: 'up' as const },
]

/** Disbursed vs collected by month, mirroring the legacy income dashboard. */
export const monthlyTrend = [
  { month: '2023-12', disbursed: 32000, collected: 27400 },
  { month: '2024-01', disbursed: 41000, collected: 35500 },
  { month: '2024-02', disbursed: 38000, collected: 36200 },
  { month: '2024-03', disbursed: 44000, collected: 39800 },
  { month: '2024-04', disbursed: 39500, collected: 41400 },
  { month: '2024-05', disbursed: 47000, collected: 44300 },
]

/** Base / collected / surplus / cash by month — the old dash*.php charts. */
export const monthlyCashFlow = [
  { month: '2023-12', base: 18000, collected: 27400, surplus: 3100, disbursed: 32000 },
  { month: '2024-01', base: 20500, collected: 35500, surplus: 4200, disbursed: 41000 },
  { month: '2024-02', base: 19800, collected: 36200, surplus: 3900, disbursed: 38000 },
  { month: '2024-03', base: 21200, collected: 39800, surplus: 4600, disbursed: 44000 },
  { month: '2024-04', base: 20900, collected: 41400, surplus: 5100, disbursed: 39500 },
  { month: '2024-05', base: 22400, collected: 44300, surplus: 5400, disbursed: 47000 },
]

export type CollectorPerformance = {
  collectorId: number
  name: string
  clients: number
  activeCredits: number
  portfolio: number
  collected: number
}

export function collectorPerformance(): CollectorPerformance[] {
  return collectors
    .filter((c) => c.active)
    .map((collector) => {
      const own = creditsForCollector(collector.id)
      const live = own.filter((c) => c.cancelledAt === null)
      const collected = ledgerEntries
        .filter(
          (e) =>
            e.kind === 'payment' &&
            !e.voided &&
            own.some((c) => c.id === e.creditId),
        )
        .reduce((sum, e) => sum + e.amount, 0)

      return {
        collectorId: collector.id,
        name: fullName(collector),
        clients: new Set(own.map((c) => c.customerId)).size,
        activeCredits: live.length,
        portfolio: round2(live.reduce((sum, c) => sum + c.outstanding, 0)),
        collected: round2(collected),
      }
    })
    .sort((a, b) => b.collected - a.collected)
}

export type AgingBucket = {
  key: 'current' | 'd1to30' | 'd31to60' | 'd60plus'
  credits: number
  amount: number
}

/** Live credits bucketed by days since their last payment. */
export function agingBuckets(): AgingBucket[] {
  const buckets: Record<AgingBucket['key'], AgingBucket> = {
    current: { key: 'current', credits: 0, amount: 0 },
    d1to30: { key: 'd1to30', credits: 0, amount: 0 },
    d31to60: { key: 'd31to60', credits: 0, amount: 0 },
    d60plus: { key: 'd60plus', credits: 0, amount: 0 },
  }

  for (const credit of activeCredits) {
    const days = daysSincePayment(credit)
    const key: AgingBucket['key'] =
      days <= 7 ? 'current' : days <= 30 ? 'd1to30' : days <= 60 ? 'd31to60' : 'd60plus'
    buckets[key].credits += 1
    buckets[key].amount = round2(buckets[key].amount + credit.outstanding)
  }

  return Object.values(buckets)
}

// ------------------------------------------------------------------ reports

export const reportDefs = [
  { id: 'credits', filters: ['dateRange', 'route', 'status'] },
  { id: 'customersByCollector', filters: ['collector', 'route'] },
  { id: 'incomeByCollector', filters: ['dateRange', 'collector'] },
] as const

export type ReportId = (typeof reportDefs)[number]['id']

export const recentReports = [
  { id: 1, reportId: 'incomeByCollector' as ReportId, by: 'Marlon Véliz', date: '2024-05-27', size: '412 KB' },
  { id: 2, reportId: 'credits' as ReportId, by: 'Marlon Véliz', date: '2024-05-24', size: '188 KB' },
  { id: 3, reportId: 'customersByCollector' as ReportId, by: 'Ana Lucía Pérez', date: '2024-05-20', size: '256 KB' },
]
