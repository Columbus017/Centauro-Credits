import 'server-only'

import { db } from '@/lib/db'
import { fromDbAmount, fromDbDate, isoDate } from '@/lib/db-utils'
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
  filter: { date?: string; customerId?: number } = {},
) {
  const entries = await db.ledgerEntry.findMany({
    where: {
      kind: 'payment',
      deletedAt: null,
      ...(filter.date ? { entryDate: isoDate(filter.date) } : {}),
      credit: {
        deletedAt: null,
        ...(filter.customerId ? { customerId: filter.customerId } : {}),
        ...(scope.collectorId === null ? {} : { collectorId: scope.collectorId }),
      },
    },
    include: paymentInclude,
    orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
  })

  return entries.map(projectPayment)
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
