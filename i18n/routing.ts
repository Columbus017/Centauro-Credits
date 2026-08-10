import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  // Spanish is the operators' language and lives at the unprefixed root
  // (`/credits`); English is available under `/en/credits`.
  localePrefix: 'as-needed',
  // This is an internal tool for Spanish-speaking staff: `/` must always be
  // Spanish rather than following the browser's `accept-language`. Switching
  // locale explicitly still persists via the locale cookie.
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]
