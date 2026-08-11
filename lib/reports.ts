/**
 * The three reports the legacy app produced, as `ReportsPDF/` + `BLL/rpt*.php`.
 *
 * Only the filter shapes live here; Phase 5 builds the documents themselves.
 * Kept out of `lib/queries/*` because the `/reports` screen needs this list to
 * render its cards and nothing about it comes from the database.
 */
export const reportDefs = [
  { id: 'credits', filters: ['dateRange', 'route', 'status'] },
  { id: 'customersByCollector', filters: ['collector', 'route'] },
  { id: 'incomeByCollector', filters: ['dateRange', 'collector'] },
] as const

export type ReportId = (typeof reportDefs)[number]['id']
