import 'server-only'

import { cache } from 'react'
import { forbidden, unauthorized } from 'next/navigation'

import { auth } from '@/lib/auth'
import type { Role } from '@/lib/roles'

export type SessionUser = {
  id: number
  name: string
  role: Role
  collectorId: number | null
}

/**
 * The signed-in user, or `null`.
 *
 * `cache()` memoises it for the render pass, so a page, its layout and the
 * shell can each ask independently without re-verifying the JWT.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth()
  if (!session?.user?.id) return null

  return {
    id: Number(session.user.id),
    name: session.user.name ?? '',
    role: session.user.role,
    collectorId: session.user.collectorId,
  }
})

/**
 * The authorization layer the legacy app never had. `templates/sideBar.php`
 * only *hid* links a role could not use — every page and every `BLL/*.php`
 * endpoint answered anyone with a session.
 *
 * These run at the data source, so they hold whether the request came from a
 * navigation, a prefetch or curl. `proxy.ts` repeats the same rules earlier for
 * speed; it is not the thing standing between a collector and the payroll.
 */
export async function requireUser() {
  const user = await getSessionUser()
  if (!user) unauthorized()
  return user
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser()
  if (!roles.includes(user.role)) forbidden()
  return user
}

export async function requireAdmin() {
  return requireRole('admin')
}

/**
 * A collector, with their `collector_id` narrowed to a number.
 *
 * A `collector` user with no linked collector row can see nothing and collect
 * nothing. The legacy app let that state through and rendered empty screens;
 * failing loudly turns a silent data error into a visible one.
 */
export async function requireCollector() {
  const user = await requireRole('collector')
  if (user.collectorId === null) forbidden()
  return { ...user, collectorId: user.collectorId }
}
