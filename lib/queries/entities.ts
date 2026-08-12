import 'server-only'

import { db } from '@/lib/db'
import { fromDbDate, fromDbDateOrNull } from '@/lib/db-utils'
import { fromCents, toCents, GOOD_RECORD_DAYS } from '@/lib/ledger'
import { today } from '@/lib/clock'
import { daysSincePayment, listCredits } from '@/lib/queries/credits'

function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`
}

// ---------------------------------------------------------------- commerce

export async function listCommerce() {
  const rows = await db.commerce.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { customers: true } } },
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    active: row.active,
    customerCount: row._count.customers,
  }))
}

// --------------------------------------------------------------- collectors

export type CollectorRow = {
  id: number
  firstName: string
  lastName: string
  name: string
  dpi: string
  mobile: string
  address: string
  birthDate: string | null
  active: boolean
  routeNames: string[]
  /** Distinct clients this collector has ever lent to. */
  clients: number
  activeCredits: number
  /** Still owed across their live credits. */
  portfolio: number
  /** Every non-voided quetzal they have ever brought in. */
  collected: number
}

/**
 * Every collector with their routes and their book.
 *
 * The dashboard's standings table and the collectors screen both need this,
 * and deriving it twice is how the legacy dashboard came to disagree with the
 * list screen.
 */
export async function listCollectors(): Promise<CollectorRow[]> {
  const [rows, credits, payments] = await Promise.all([
    db.collector.findMany({
      orderBy: [{ active: 'desc' }, { firstName: 'asc' }],
      include: { routes: { where: { active: true }, select: { name: true } } },
    }),
    listCredits({ collectorId: null }),
    db.ledgerEntry.findMany({
      where: {
        kind: 'payment',
        deletedAt: null,
        voidedAt: null,
        credit: { deletedAt: null },
      },
      select: { amount: true, credit: { select: { collectorId: true } } },
    }),
  ])

  const collectedCents = new Map<number, number>()
  for (const payment of payments) {
    const id = payment.credit.collectorId
    collectedCents.set(id, (collectedCents.get(id) ?? 0) + toCents(payment.amount.toString()))
  }

  return rows.map((row) => {
    const own = credits.filter((credit) => credit.collectorId === row.id)
    const live = own.filter((credit) => credit.cancelledAt === null)

    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      name: fullName(row),
      dpi: row.dpi ?? '',
      mobile: row.mobile ?? '',
      address: row.address ?? '',
      birthDate: fromDbDateOrNull(row.birthDate),
      active: row.active,
      routeNames: row.routes.map((route) => route.name),
      clients: new Set(own.map((credit) => credit.customerId)).size,
      activeCredits: live.length,
      portfolio: fromCents(
        live.reduce((sum, credit) => sum + toCents(credit.outstanding), 0),
      ),
      collected: fromCents(collectedCents.get(row.id) ?? 0),
    }
  })
}

export async function getCollector(id: number) {
  const collectors = await listCollectors()
  return collectors.find((collector) => collector.id === id) ?? null
}

/** Active collectors only — the choices a form may offer. */
export async function collectorOptions() {
  const rows = await db.collector.findMany({
    where: { active: true },
    orderBy: { firstName: 'asc' },
    select: { id: true, firstName: true, lastName: true },
  })

  return rows.map((row) => ({ value: String(row.id), label: fullName(row) }))
}

// ------------------------------------------------------------------- routes

export type RouteRow = {
  id: number
  code: string
  name: string
  details: string
  collectorId: number | null
  collectorName: string
  active: boolean
  customerCount: number
  activeCredits: number
  portfolio: number
}

/**
 * Routes with the book that sits on them.
 *
 * A route has no credits of its own — the chain is route → customers →
 * credits — so the totals are gathered from the credit list rather than a
 * count on the route row.
 */
export async function listRoutes(): Promise<RouteRow[]> {
  const [rows, credits, customers] = await Promise.all([
    db.route.findMany({
      orderBy: [{ active: 'desc' }, { code: 'asc' }],
      include: { collector: true, _count: { select: { customers: true } } },
    }),
    listCredits({ collectorId: null }, { status: 'active' }),
    db.customer.findMany({ select: { id: true, routeId: true } }),
  ])

  const routeOfCustomer = new Map(customers.map((c) => [c.id, c.routeId]))

  return rows.map((row) => {
    const live = credits.filter(
      (credit) => routeOfCustomer.get(credit.customerId) === row.id,
    )

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      details: row.details ?? '',
      collectorId: row.collectorId,
      collectorName: row.collector ? fullName(row.collector) : '—',
      active: row.active,
      customerCount: row._count.customers,
      activeCredits: live.length,
      portfolio: fromCents(
        live.reduce((sum, credit) => sum + toCents(credit.outstanding), 0),
      ),
    }
  })
}

export async function getRoute(id: number) {
  const routes = await listRoutes()
  return routes.find((route) => route.id === id) ?? null
}

export async function routeOptions() {
  const rows = await db.route.findMany({
    where: { active: true },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  })

  return rows.map((row) => ({
    value: String(row.id),
    label: `${row.code} · ${row.name}`,
  }))
}

export async function commerceOptions() {
  const rows = await db.commerce.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return rows.map((row) => ({ value: String(row.id), label: row.name }))
}

// ---------------------------------------------------------------- customers

export type CustomerRow = {
  id: number
  firstName: string
  lastName: string
  name: string
  dpi: string
  address: string
  mobile: string
  mobile2: string
  commerceId: number | null
  commerceName: string
  routeId: number | null
  routeName: string
  collectorName: string
  active: boolean
  /** Row creation, which for migrated clients is the ETL run — see `since`. */
  createdAt: string
}

const customerInclude = {
  commerce: true,
  route: { include: { collector: true } },
} as const

type CustomerWithRelations = Awaited<
  ReturnType<typeof db.customer.findFirstOrThrow<{ include: typeof customerInclude }>>
>

function projectCustomer(row: CustomerWithRelations): CustomerRow {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    name: fullName(row),
    dpi: row.dpi ?? '',
    address: row.address ?? '',
    mobile: row.mobile ?? '',
    mobile2: row.mobile2 ?? '',
    commerceId: row.commerceId,
    commerceName: row.commerce?.name ?? '—',
    routeId: row.routeId,
    routeName: row.route?.name ?? '—',
    collectorName: row.route?.collector ? fullName(row.route.collector) : '—',
    active: row.active,
    createdAt: fromDbDate(row.createdAt),
  }
}

export async function listCustomers(): Promise<CustomerRow[]> {
  const rows = await db.customer.findMany({
    orderBy: [{ active: 'desc' }, { firstName: 'asc' }],
    include: customerInclude,
  })

  return rows.map(projectCustomer)
}

export async function getCustomer(id: number) {
  const row = await db.customer.findUnique({ where: { id }, include: customerInclude })
  return row ? projectCustomer(row) : null
}

export type CustomerPortfolioRow = CustomerRow & {
  balance: number
  activeCredits: number
  /** At least one live credit past the grace window. */
  atRisk: boolean
}

/**
 * The client list with each one's book attached.
 *
 * One pass over the credits rather than a query per client: the legacy
 * `listCustomers.php` ran a correlated subquery per row and the page slowed
 * down as the book grew.
 */
export async function listCustomersWithPortfolio(
  asOf = today(),
): Promise<CustomerPortfolioRow[]> {
  const [customers, credits] = await Promise.all([
    listCustomers(),
    listCredits({ collectorId: null }),
  ])

  const byCustomer = new Map<number, typeof credits>()
  for (const credit of credits) {
    const list = byCustomer.get(credit.customerId)
    if (list) list.push(credit)
    else byCustomer.set(credit.customerId, [credit])
  }

  return customers.map((customer) => {
    const own = byCustomer.get(customer.id) ?? []
    const live = own.filter((credit) => credit.cancelledAt === null)

    return {
      ...customer,
      balance: fromCents(own.reduce((sum, credit) => sum + toCents(credit.outstanding), 0)),
      activeCredits: live.length,
      atRisk: live.some((credit) => daysSincePayment(credit, asOf) > GOOD_RECORD_DAYS),
    }
  })
}

/** Active clients only, for the credit forms. */
export async function customerOptions() {
  const rows = await db.customer.findMany({
    where: { active: true },
    orderBy: { firstName: 'asc' },
    select: { id: true, firstName: true, lastName: true },
  })

  return rows.map((row) => ({ value: String(row.id), label: fullName(row) }))
}

// -------------------------------------------------------------------- users

export async function listUsers() {
  const rows = await db.user.findMany({
    orderBy: [{ active: 'desc' }, { username: 'asc' }],
    include: { collector: true },
  })

  return rows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    name: fullName(row),
    username: row.username,
    role: row.role,
    collectorId: row.collectorId,
    collectorName: row.collector ? fullName(row.collector) : '—',
    active: row.active,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  }))
}
