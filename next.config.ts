import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Emits `.next/standalone` — a self-contained server plus only the
  // `node_modules` files the traced routes actually import. It is what the
  // `runner` stage of the Dockerfile copies, and the reason the deployed image
  // needs no `pnpm install` and no lockfile.
  //
  // It is a **self-hosting** output, and asking for it on Vercel breaks the
  // build: the copy step reads `.next/next-server.js.nft.json`, a trace file
  // Vercel's own pipeline does not leave behind, and the build dies with
  // `ENOENT … next-server.js.nft.json`. Vercel traces and bundles the app
  // itself, so there it must be off. `VERCEL` is set in every Vercel build.
  output: process.env.VERCEL ? undefined : 'standalone',

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
