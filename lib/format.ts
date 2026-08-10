// The business operates in Guatemala: amounts are quetzales and dates are
// read by Spanish-speaking staff. These helpers are locale-aware so the same
// screens render correctly under `/en` without duplicating markup.

// `narrowSymbol` keeps the familiar `Q` in both locales; the default display
// renders GTQ as the literal "GTQ" under `en`, which no operator here reads.
const GTQ = {
  style: 'currency',
  currency: 'GTQ',
  currencyDisplay: 'narrowSymbol',
} as const

/**
 * The app's locales are the bare `es` / `en` used in URLs, but formatting must
 * be regional: plain `es` is Spain, which renders `24.450 GTQ` instead of
 * Guatemala's `Q24,450.00`. Always resolve before handing a locale to Intl.
 */
export function intlLocale(locale = 'es') {
  if (locale.includes('-')) return locale
  return locale === 'en' ? 'en-US' : 'es-GT'
}

/** `Q1,234` — whole quetzales, for KPI tiles and summary strips. */
export function formatQ(value: number, locale?: string) {
  return new Intl.NumberFormat(intlLocale(locale), {
    ...GTQ,
    maximumFractionDigits: 0,
  }).format(value)
}

/** `Q1,234.50` — the ledger and anything that must reconcile to the cent. */
export function formatQCents(value: number, locale?: string) {
  return new Intl.NumberFormat(intlLocale(locale), {
    ...GTQ,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * `Q45 mil` — chart axes, where the full figure never fits. Currency style is
 * deliberately avoided here: compact currency produces long words that get
 * clipped by the axis width.
 */
export function formatQCompact(value: number, locale?: string) {
  const compact = new Intl.NumberFormat(intlLocale(locale), {
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(value)
  return `Q${compact}`
}

export function formatNumber(value: number, locale?: string) {
  return new Intl.NumberFormat(intlLocale(locale)).format(value)
}

export function formatPercent(value: number, locale?: string) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

/**
 * Dates are stored as plain `YYYY-MM-DD` strings. Parsing them with `new Date()`
 * would treat them as UTC midnight and shift them a day backwards in Guatemala,
 * so build the date from its parts instead.
 */
function parseISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** `14 ene 2024` */
export function formatDate(iso: string, locale?: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseISODate(iso))
}

/** `14/01/2024` — for dense tables where the long form wraps. */
export function formatDateShort(iso: string, locale?: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseISODate(iso))
}

/** `ene` — short month name from a `YYYY-MM` key, for chart axes. */
export function formatMonth(yearMonth: string, locale?: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'short' }).format(
    new Date(year, month - 1, 1),
  )
}

/** Whole days between two `YYYY-MM-DD` dates. */
export function daysBetween(fromISO: string, toISO: string) {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()
  return Math.round(ms / 86_400_000)
}
