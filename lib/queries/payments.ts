import 'server-only'

import { db } from '@/lib/db'
import { fromDbAmount, fromDbDate, isoDate } from '@/lib/db-utils'
import { paged, pageParams, searchTerms, type Paged, type SortState } from '@/lib/pagination'
import type { Scope } from '@/lib/queries/credits'

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

const paymentInclude = {
  credit: {
    include: {
      collector: true,
      customer: { include: { route: true } },
    },
  },
} as const

type PaymentWithRelations = Awaited<
  ReturnType<typeof db.ledgerEntry.findFirstOrThrow<{ include: typeof paymentInclude }>>
>

function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`
}

function projectPayment(entry: PaymentWithRelations): PaymentRow {
  return {
    id: entry.id,
    creditId: entry.creditId,
    creditCode: entry.credit.code,
    customerName: fullName(entry.credit.customer),
    collectorName: fullName(entry.credit.collector),
    routeName: entry.credit.customer.route?.name ?? '—',
    date: fromDbDate(entry.entryDate),
    amount: fromDbAmount(entry.amount),
    runningBalance: fromDbAmount(entry.runningBalance),
    voided: entry.voidedAt !== null,
  }
}

/**
 * Posted payments, newest first.
 *
 * `runningBalance` is read from the column rather than re-derived: this is a
 * flat list across every credit, and a receipt has to show the balance as it
 * stood when the money changed hands. Every write path maintains it through
 * `recalculateBalances()`, so it is the record of what was printed.
 */
export async function listPayments(
  scope: Scope,
  filter: PaymentFilter = {},
) {
  const entries = await db.ledgerEntry.findMany({
    where: paymentWhere(scope, filter),
    include: paymentInclude,
    orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
  })

  return entries.map(projectPayment)
}

export type PaymentFilter = {
  date?: string
  customerId?: number
  /** Free text over the client's name and the credit's card number. */
  search?: string
  /** Narrows to one collector's round — the screen's *Cobrador* select. */
  collectorId?: number
}

/**
 * One `where` for the page, the count and the totals, so the table can never
 * show a different set from the figures above it.
 */
function paymentWhere(scope: Scope, filter: PaymentFilter) {
  const terms = searchTerms(filter.search)

  return {
    kind: 'payment' as const,
    deletedAt: null,
    ...(filter.date ? { entryDate: isoDate(filter.date) } : {}),
    credit: {
      deletedAt: null,
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      // The filter narrows *within* the scope; it can never widen it. An
      // admin passes `collectorId: null` as scope and may then pick one, a
      // collector's scope is their own id and the filter cannot escape it.
      ...(scope.collectorId === null
        ? filter.collectorId
          ? { collectorId: filter.collectorId }
          : {}
        : { collectorId: scope.collectorId }),
    },
    ...(terms.length
      ? {
          AND: terms.map((term) => ({
            credit: {
              OR: [
                { code: { contains: term, mode: 'insensitive' as const } },
                { customer: { firstName: { contains: term, mode: 'insensitive' as const } } },
                { customer: { lastName: { contains: term, mode: 'insensitive' as const } } },
              ],
            },
          })),
        }
      : {}),
  }
}

export const PAYMENT_SORT_KEYS = [
  'date',
  'credit',
  'client',
  'collector',
  'route',
  'amount',
  'balance',
  'status',
] as const
export type PaymentSortKey = (typeof PAYMENT_SORT_KEYS)[number]

/**
 * Unlike the credit and client lists, nothing here comes from walking the
 * ledger — `balance` is the stored `runningBalance` column, per the note on
 * `listPayments` above — so every column is a real sort, not a page-local one.
 */
function paymentOrderBy(sort: SortState<PaymentSortKey>) {
  if (!sort) return [{ entryDate: 'desc' as const }, { id: 'desc' as const }]

  switch (sort.key) {
    case 'date':
      return [{ entryDate: sort.dir }, { id: sort.dir }]
    case 'credit':
      return { credit: { code: sort.dir } }
    case 'client':
      return { credit: { customer: { firstName: sort.dir } } }
    case 'collector':
      return { credit: { collector: { firstName: sort.dir } } }
    case 'route':
      return { credit: { customer: { route: { name: sort.dir } } } }
    case 'amount':
      return { amount: sort.dir }
    case 'balance':
      return { runningBalance: sort.dir }
    case 'status':
      return { voidedAt: sort.dir }
  }
}

/**
 * One page of payments, newest first.
 *
 * The whole list was rendered until the real book arrived: 57,131 rows, 297 MB
 * of HTML, 23 seconds. The count runs first so the page can be clamped to what
 * actually exists.
 */
export async function listPaymentsPage(
  scope: Scope,
  filter: PaymentFilter,
  page: number,
  sort: SortState<PaymentSortKey> = null,
): Promise<Paged<PaymentRow>> {
  const where = paymentWhere(scope, filter)

  const total = await db.ledgerEntry.count({ where })
  const params = pageParams(page, total)

  const entries = await db.ledgerEntry.findMany({
    where,
    include: paymentInclude,
    orderBy: paymentOrderBy(sort),
    skip: params.skip,
    take: params.take,
  })

  return paged(entries.map(projectPayment), total, params)
}

/**
 * The four figures above the table, over the whole filtered set rather than
 * the page — a summary of what you can see one page of.
 *
 * Aggregated in SQL: these used to be `reduce()` over every row, which is
 * exactly what the paging is here to stop loading.
 */
export async function paymentSummary(scope: Scope, filter: PaymentFilter, asOf: string) {
  const where = paymentWhere(scope, filter)

  const [posted, voided, todayTotal] = await Promise.all([
    db.ledgerEntry.aggregate({
      where: { ...where, voidedAt: null },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    db.ledgerEntry.count({ where: { ...where, voidedAt: { not: null } } }),
    db.ledgerEntry.aggregate({
      where: { ...where, voidedAt: null, entryDate: isoDate(asOf) },
      _sum: { amount: true },
    }),
  ])

  const count = posted._count._all
  const total = posted._sum.amount ? fromDbAmount(posted._sum.amount) : 0

  return {
    count,
    voided,
    total,
    average: count > 0 ? total / count : 0,
    collectedToday: todayTotal._sum.amount ? fromDbAmount(todayTotal._sum.amount) : 0,
  }
}

export async function getPayment(id: number, scope: Scope) {
  const entry = await db.ledgerEntry.findFirst({
    where: {
      id,
      kind: 'payment',
      deletedAt: null,
      credit: {
        deletedAt: null,
        ...(scope.collectorId === null ? {} : { collectorId: scope.collectorId }),
      },
    },
    include: paymentInclude,
  })

  return entry ? projectPayment(entry) : null
}

/** The most recent day this collector booked money — the `/field/today` view. */
export async function lastCollectionDate(collectorId: number) {
  const latest = await db.ledgerEntry.findFirst({
    where: {
      kind: 'payment',
      deletedAt: null,
      voidedAt: null,
      credit: { deletedAt: null, collectorId },
    },
    orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
    select: { entryDate: true },
  })

  return latest ? fromDbDate(latest.entryDate) : null
}
