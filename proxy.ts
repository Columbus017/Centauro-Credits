import NextAuth from 'next-auth'
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { authConfig } from './lib/auth.config'
import { canAccess, isPublicPath, roleHome, stripLocale } from './lib/roles'
import { routing } from './i18n/routing'

// Next 16 renamed the `middleware` file convention to `proxy`; next-intl still
// ships its handler factory under the old name.
const intlProxy = createIntlMiddleware(routing)

// Session reads only — the Prisma-backed provider lives in `lib/auth.ts` and
// has no business running on every request. See `lib/auth.config.ts`.
const { auth } = NextAuth(authConfig)

/** The locale segment of an incoming URL; `as-needed` leaves Spanish bare. */
function localeOf(pathname: string) {
  const first = pathname.split('/')[1]
  return routing.locales.find((locale) => locale === first) ?? routing.defaultLocale
}

/** A user-facing URL in the same locale as the request. */
function localized(request: NextRequest, path: string) {
  const locale = localeOf(request.nextUrl.pathname)
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  const target = path === '/' ? prefix || '/' : `${prefix}${path}`
  return new URL(target, request.nextUrl)
}

/**
 * The first of the three authorization layers (proxy → `lib/session.ts` →
 * the `nav` filter in `app-shell.tsx`). The legacy app had only the third.
 *
 * Per the Next.js authentication guide this check is *optimistic*: it reads the
 * session cookie and never the database, because it runs on every request
 * including prefetches. The decision it reaches is repeated at the data source
 * by `requireUser()` / `requireRole()`, which is what actually protects a row.
 */
export default auth((request) => {
  const path = stripLocale(request.nextUrl.pathname)
  const user = request.auth?.user

  if (!user) {
    if (isPublicPath(path)) return intlProxy(request)
    // `functions/sesiones.php` did exactly this — bounce to the login screen.
    return NextResponse.redirect(localized(request, '/login'))
  }

  // A signed-in user has no use for the login screen.
  if (isPublicPath(path)) {
    return NextResponse.redirect(localized(request, roleHome(user.role)))
  }

  if (!canAccess(user.role, path)) {
    // Rewritten, not redirected: the URL the user typed keeps showing, and
    // `/forbidden` calls `forbidden()` so the response really is a 403 rather
    // than a 200 that says "no".
    const locale = localeOf(request.nextUrl.pathname)
    return NextResponse.rewrite(new URL(`/${locale}/forbidden`, request.nextUrl))
  }

  return intlProxy(request)
})

export const config = {
  // Skip Next.js internals, the API surface, and anything with a file
  // extension. `/api/auth/*` is Auth.js's own endpoint set and must stay out.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
