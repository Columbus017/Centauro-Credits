import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

// Next 16 renamed the `middleware` file convention to `proxy`; next-intl still
// ships its handler factory under the old name.
export default createMiddleware(routing)

export const config = {
  // Skip Next.js internals, the API surface, and anything with a file extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
