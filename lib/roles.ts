import { routing } from '@/i18n/routing'

/**
 * Where `proxy.ts` sends a request whose role may not have it. The route
 * calls `forbidden()`, so the response carries a real 403 while the address
 * bar keeps showing what the user asked for.
 */
export const DENIED_PATH = '/denied'

/**
 * The old app's two `user.permissions` values: 0 = admin, 1 = collector.
 * Mirrors the `UserRole` enum in `prisma/schema.prisma`.
 */
export type Role = 'admin' | 'collector'

/**
 * Routes reachable without a session. Everything else requires one.
 *
 * The legacy app guarded every page with `functions/sesiones.php`, which
 * redirected to `login.php` when `$_SESSION['usuario']` was unset.
 */
const PUBLIC_PATHS = ['/login']

/**
 * What a `collector` may reach. Admins may reach everything.
 *
 * The legacy sidebar gave collectors two screens — "Ingresar pago"
 * (`listCreditsOp.php`) and "Ver pagos de hoy" (`listIncomesOp.php`) — which
 * became `/field/collect` and `/field/today`. The two detail routes are here
 * because the collector screens link into them and the legacy equivalents were
 * reachable: `listCreditsOp.php` opened the credit's "Balance de Saldos" modal,
 * and a receipt is the paper a collector hands over after taking cash.
 *
 * These are *route* permissions only. Restricting a collector to their own
 * credits is a row-level check that needs real data — it lands in Phase 4,
 * where every read goes through a query already filtered by `collector_id`.
 */
const COLLECTOR_PATHS = [
  /^\/field(\/|$)/,
  // Numeric ids only. `[^/]+` would also have matched the sibling routes
  // `/credits/new` and `/credits/import`, handing a collector the two screens
  // that create credits.
  /^\/credits\/\d+$/,
  /^\/payments\/\d+\/receipt$/,
]

/**
 * `/field/*` is "my round" for the signed-in collector, so an admin has no
 * meaningful view of it — every figure on those screens is scoped to a
 * `collector_id` an admin does not have.
 */
const FIELD_PATH = /^\/field(\/|$)/

/**
 * Reachable by any signed-in user: the route `proxy.ts` rewrites a denied
 * request to. Without it the denial would deny its own denial page.
 */
const ALWAYS_ALLOWED = [DENIED_PATH]

/** The screen a role lands on after signing in. */
export function roleHome(role: Role) {
  return role === 'admin' ? '/' : '/field/collect'
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname)
}

export function canAccess(role: Role, pathname: string) {
  if (ALWAYS_ALLOWED.includes(pathname)) return true
  if (role === 'admin') return !FIELD_PATH.test(pathname)
  return COLLECTOR_PATHS.some((pattern) => pattern.test(pathname))
}

/**
 * Drops the `next-intl` locale segment so route rules are written once.
 *
 * `localePrefix: 'as-needed'` means Spanish arrives unprefixed (`/credits`)
 * and English prefixed (`/en/credits`); both must match the same rule.
 */
export function stripLocale(pathname: string) {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/'
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1)
  }
  return pathname
}
