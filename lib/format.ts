// The business operates in Guatemala: amounts are quetzales and dates are
// read by Spanish-speaking staff. These helpers are locale-aware so the same
// screens render correctly under `/en` without duplicating markup.

const GTQ = { style: 'currency', currency: 'GTQ' } as const

/** `Q1,234` — whole quetzales, for KPI tiles and chart axes. */
export function formatQ(value: number, locale = 'es-GT') {
  return new Intl.NumberFormat(locale, {
    ...GTQ,
    maximumFractionDigits: 0,
  }).format(value)
}

/** `Q1,234.50` — the ledger and anything that must reconcile to the cent. */
export function formatQCents(value: number, locale = 'es-GT') {
  return new Intl.NumberFormat(locale, {
    ...GTQ,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Compact form for chart axes, where `Q128,400` is too wide to fit. */
export function formatQCompact(value: number, locale = 'es-GT') {
  return new Intl.NumberFormat(locale, {
    ...GTQ,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatNumber(value: number, locale = 'es-GT') {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatPercent(value: number, locale = 'es-GT') {
  return new Intl.NumberFormat(locale, {
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
export function formatDate(iso: string, locale = 'es-GT') {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseISODate(iso))
}

/** `14/01/2024` — for dense tables where the long form wraps. */
export function formatDateShort(iso: string, locale = 'es-GT') {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseISODate(iso))
}

/** `ene` — short month name from a `YYYY-MM` key, for chart axes. */
export function formatMonth(yearMonth: string, locale = 'es-GT') {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(
    new Date(year, month - 1, 1),
  )
}

/** Whole days between two `YYYY-MM-DD` dates. */
export function daysBetween(fromISO: string, toISO: string) {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()
  return Math.round(ms / 86_400_000)
}
