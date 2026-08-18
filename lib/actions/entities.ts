'use server'

import { z } from 'zod'

import { db } from '@/lib/db'
import { isoDate } from '@/lib/db-utils'
import { requireAdmin } from '@/lib/session'
import { redirect } from '@/i18n/navigation'
import {
  foreignKey,
  localeFrom,
  optionalForeignKey,
  optionalIsoDate,
  optionalText,
  parseForm,
  requiredText,
  revalidate,
  type FormState,
} from '@/lib/actions/shared'

// ---------------------------------------------------------------- collectors

const collectorSchema = z.object({
  firstName: requiredText(80),
  lastName: requiredText(80),
  dpi: optionalText(20),
  mobile: optionalText(20),
  address: optionalText(500),
  birthDate: optionalIsoDate,
})

/** Ports `BLL/collector.php` — `nuevo`. */
export async function createCollector(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(collectorSchema, formData)
  if (!parsed.ok) return parsed.state

  const { birthDate, ...rest } = parsed.data
  await db.collector.create({
    data: { ...rest, birthDate: birthDate ? isoDate(birthDate) : null },
  })

  revalidate('/collectors', '/routes', '/')
  redirect({
    href: { pathname: '/collectors', query: { toast: 'collectorCreated' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

export async function updateCollector(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(collectorSchema.extend({ id: foreignKey }), formData)
  if (!parsed.ok) return parsed.state

  const { id, birthDate, ...rest } = parsed.data
  await db.collector.update({
    where: { id },
    data: { ...rest, birthDate: birthDate ? isoDate(birthDate) : null },
  })

  revalidate('/collectors', '/collectors/[id]', '/routes', '/')
  redirect({
    href: { pathname: `/collectors/${id}`, query: { toast: 'collectorUpdated' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

/**
 * The legacy `state = 1` soft delete. A collector who has ever held a credit
 * is never removed — the ledger has to keep naming who took the money.
 */
export async function setCollectorActive(formData: FormData) {
  await requireAdmin()

  const id = Number(formData.get('id'))
  const active = formData.get('active') === 'true'
  if (!Number.isInteger(id)) return

  await db.collector.update({ where: { id }, data: { active } })
  revalidate('/collectors', '/collectors/[id]', '/routes', '/')
}

// -------------------------------------------------------------------- routes

const routeSchema = z.object({
  code: requiredText(20),
  name: requiredText(120),
  details: optionalText(1000),
  collectorId: optionalForeignKey,
})

/** Ports `BLL/route.php` — `nueva`. */
export async function createRoute(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(routeSchema, formData)
  if (!parsed.ok) return parsed.state

  await db.route.create({ data: parsed.data })

  revalidate('/routes', '/clients', '/')
  redirect({
    href: { pathname: '/routes', query: { toast: 'routeCreated' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

export async function updateRoute(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(routeSchema.extend({ id: foreignKey }), formData)
  if (!parsed.ok) return parsed.state

  const { id, ...rest } = parsed.data
  await db.route.update({ where: { id }, data: rest })

  revalidate('/routes', '/routes/[id]', '/clients', '/clients/[id]', '/')
  redirect({
    href: { pathname: `/routes/${id}`, query: { toast: 'routeUpdated' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

export async function setRouteActive(formData: FormData) {
  await requireAdmin()

  const id = Number(formData.get('id'))
  const active = formData.get('active') === 'true'
  if (!Number.isInteger(id)) return

  await db.route.update({ where: { id }, data: { active } })
  revalidate('/routes', '/routes/[id]', '/clients', '/')
}

// ----------------------------------------------------------------- customers

const customerSchema = z.object({
  firstName: requiredText(80),
  lastName: requiredText(80),
  dpi: optionalText(20),
  address: optionalText(500),
  mobile: optionalText(20),
  mobile2: optionalText(20),
  routeId: optionalForeignKey,
  commerceId: optionalForeignKey,
})

/** Ports `BLL/customer.php` — `nuevo`. */
export async function createCustomer(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(customerSchema, formData)
  if (!parsed.ok) return parsed.state

  const customer = await db.customer.create({ data: parsed.data })

  revalidate('/clients', '/routes', '/')
  redirect({
    href: { pathname: `/clients/${customer.id}`, query: { toast: 'customerCreated' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

export async function updateCustomer(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(customerSchema.extend({ id: foreignKey }), formData)
  if (!parsed.ok) return parsed.state

  const { id, ...rest } = parsed.data
  await db.customer.update({ where: { id }, data: rest })

  revalidate('/clients', '/clients/[id]', '/credits', '/routes', '/')
  redirect({
    href: { pathname: `/clients/${id}`, query: { toast: 'customerUpdated' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

export async function setCustomerActive(formData: FormData) {
  await requireAdmin()

  const id = Number(formData.get('id'))
  const active = formData.get('active') === 'true'
  if (!Number.isInteger(id)) return

  await db.customer.update({ where: { id }, data: { active } })
  revalidate('/clients', '/clients/[id]', '/')
}

// ------------------------------------------------------------------ commerce

const commerceSchema = z.object({ name: requiredText(120) })

/**
 * Ports `BLL/commerce.php`, which only ever created. The legacy table has no
 * `state` column, so a marketplace typed by mistake stayed in every dropdown
 * for good; `commerce.active` (added in Phase 2) is what retires one.
 */
export async function createCommerce(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(commerceSchema, formData)
  if (!parsed.ok) return parsed.state

  await db.commerce.create({ data: parsed.data })
  revalidate('/admin/settings', '/clients')
  return { ok: true }
}

export async function setCommerceActive(formData: FormData) {
  await requireAdmin()

  const id = Number(formData.get('id'))
  const active = formData.get('active') === 'true'
  if (!Number.isInteger(id)) return

  await db.commerce.update({ where: { id }, data: { active } })
  revalidate('/admin/settings', '/clients')
}
