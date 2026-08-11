import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Turns on `forbidden()` / `unauthorized()` and their `forbidden.tsx` /
    // `unauthorized.tsx` boundaries, so a denied request answers with a real
    // 403 or 401 instead of a 200 page that merely says so. Still flagged
    // experimental by Next; it is the only sanctioned way to set those codes
    // from a Server Component.
    authInterrupts: true,
  },
}

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

export default withNextIntl(nextConfig)
