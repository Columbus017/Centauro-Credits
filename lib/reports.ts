/**
 * The three reports the legacy app produced, as `ReportsPDF/` + `BLL/rpt*.php`.
 *
 * Pure and client-safe: the filter shapes, the column layouts and the row
 * selection rules live here, so the `/reports` screen, the PDF documents and
 * the API route all read the same definition. `lib/queries/reports.ts` is the
 * server half that fetches against them.
 *
 * The filters are the legacy ones, which are not the ones Phase 1 guessed at:
 * every report is scoped to exactly one collector, because all three legacy
 * forms opened with a mandatory *Cobrador* select.
 */

import { z } from 'zod'

import { formatDateShort, formatQCents } from '@/lib/format'

// ------------------------------------------------------------- definitions

export type ReportFilter = 'collector' | 'dateRange' | 'date'

/**
 * In the legacy tab order: *Clientes por cobrador*, *Créditos terminados por
 * cobrador*, *Ingresos por fecha*.
 */
export const reportDefs = [
  { id: 'customersByCollector', filters: ['collector'] },
  { id: 'credits', filters: ['collector', 'dateRange'] },
  { id: 'incomeByCollector', filters: ['collector', 'date'] },
] as const satisfies readonly { id: string; filters: readonly ReportFilter[] }[]

export type ReportId = (typeof reportDefs)[number]['id']

export const reportIds = reportDefs.map((def) => def.id) as ReportId[]

export function isReportId(value: string): value is ReportId {
  return (reportIds as string[]).includes(value)
}

// ----------------------------------------------------------------- columns

/**
 * How a cell is rendered. The screen and the PDF each own their markup but
 * share this, so the two can never list different columns in a different
 * order — the legacy table and its PDF disagreed on exactly that (the AJAX
 * table for report 3 had six columns and no PDF existed at all).
 */
export type ColumnKind = 'code' | 'date' | 'text' | 'money'

export type ReportColumn = {
  /** Message key under `reports.columns.*`. */
  key: string
  kind: ColumnKind
  /** Relative width, for the PDF's fixed-layout table. */
  width: number
}

/** Money reads right-aligned in both renderers; everything else reads left. */
export function isNumericColumn(column: ReportColumn) {
  return column.kind === 'money'
}

/**
 * A cell as display text, in the reader's locale.
 *
 * Shared by the screen and the PDF so a downloaded report says exactly what
 * the table above the download button said. The queries hand back ISO dates
 * and plain numbers precisely so this can happen once, here.
 */
export function formatReportCell(
  value: string | number | null,
  kind: ColumnKind,
  locale: string,
) {
  if (value === null || value === '') return '—'
  if (kind === 'money') return formatQCents(Number(value), locale)
  if (kind === 'date') return formatDateShort(String(value), locale)
  return String(value)
}

export const reportColumns: Record<ReportId, ReportColumn[]> = {
  customersByCollector: [
    { key: 'code', kind: 'code', width: 14 },
    { key: 'startDate', kind: 'date', width: 13 },
    { key: 'client', kind: 'text', width: 26 },
    { key: 'commerce', kind: 'text', width: 18 },
    { key: 'route', kind: 'text', width: 17 },
    { key: 'outstanding', kind: 'money', width: 12 },
  ],
  credits: [
    { key: 'code', kind: 'code', width: 13 },
    { key: 'startDate', kind: 'date', width: 12 },
    { key: 'client', kind: 'text', width: 21 },
    { key: 'commerce', kind: 'text', width: 14 },
    { key: 'route', kind: 'text', width: 13 },
    { key: 'totalDue', kind: 'money', width: 11 },
    // Wide enough for "Fecha de cancelación" on one line: react-pdf hyphenates
    // a heading that does not fit, and "Fecha de can-celación" is not a word.
    { key: 'cancelledAt', kind: 'date', width: 16 },
  ],
  incomeByCollector: [
    { key: 'code', kind: 'code', width: 15 },
    { key: 'startDate', kind: 'date', width: 14 },
    { key: 'client', kind: 'text', width: 27 },
    { key: 'commerce', kind: 'text', width: 20 },
    { key: 'totalDue', kind: 'money', width: 12 },
    { key: 'payment', kind: 'money', width: 12 },
  ],
}

/**
 * The column each report totals, or `null` where the legacy screen showed no
 * total. Report 2 gets none on purpose: its form had no total box, and Phase 4
 * already established that a figure the old app never produced does not get
 * invented here.
 */
export type TotalKey = 'outstanding' | 'payment'

export const reportTotals: Record<ReportId, TotalKey | null> = {
  customersByCollector: 'outstanding',
  credits: null,
  incomeByCollector: 'payment',
}

// ---------------------------------------------------------------- filters

const collectorId = z.coerce.number().int().positive()

/**
 * `YYYY-MM-DD` only. The legacy forms fed a `d/m/Y` datepicker string through
 * `strtotime()`, which reads `01/02/2024` as *January 2nd* — a silent
 * off-by-a-month on every report run with an ambiguous day.
 */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const reportParams = {
  customersByCollector: z.object({ collectorId }),
  credits: z
    .object({ collectorId, from: isoDate, to: isoDate })
    .refine((value) => value.from <= value.to, { path: ['to'] }),
  incomeByCollector: z.object({ collectorId, date: isoDate }),
} satisfies Record<ReportId, z.ZodType>

export type ReportParams = {
  [K in ReportId]: z.infer<(typeof reportParams)[K]>
}

/** Parses raw search params for one report, or `null` if they do not fit. */
export function parseReportParams<T extends ReportId>(
  id: T,
  raw: Record<string, string | undefined>,
): ReportParams[T] | null {
  const parsed = reportParams[id].safeParse(raw)
  return parsed.success ? (parsed.data as ReportParams[T]) : null
}

// -------------------------------------------------------------- selection

/**
 * Inclusive on both ends, matching SQL `BETWEEN`. `YYYY-MM-DD` sorts
 * lexicographically in calendar order, so no parsing is needed — and none
 * happens, which is what keeps a time zone out of a date comparison.
 */
export function withinRange(iso: string, from: string, to: string) {
  return iso >= from && iso <= to
}

export function sumBy<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce((total, row) => total + value(row), 0)
}
