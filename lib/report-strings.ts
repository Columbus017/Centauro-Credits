import 'server-only'

import { getTranslations } from 'next-intl/server'

import { today } from '@/lib/clock'
import { formatDateLong, formatDateShort } from '@/lib/format'
import { reportColumns, reportTotals, type ReportId, type ReportParams } from '@/lib/reports'
import type { ReportResult } from '@/lib/queries/reports'
import type { ReportPdfStrings } from '@/components/reports/report-pdf'

/**
 * The headings a report carries, resolved once for both renderers.
 *
 * The API route has no request locale of its own — it lives outside
 * `app/[locale]/` — so it passes one explicitly and `next-intl` resolves the
 * same catalogue the screen used. Building the strings here rather than inside
 * the PDF component is what lets the document stay a pure function of its
 * props: `renderToBuffer` renders outside Next's request context, where the
 * `useTranslations` hook has nothing to read.
 */
export async function reportHeadings(
  id: ReportId,
  params: ReportParams[ReportId],
  collectorName: string,
  locale: string,
) {
  const t = await getTranslations({ locale, namespace: 'reports' })

  const heading = t(`defs.${id}.heading`, { collector: collectorName })

  let subtitle: string | null = null
  if (id === 'credits') {
    const { from, to } = params as ReportParams['credits']
    subtitle = t('subtitle.dateRange', {
      from: formatDateLong(from, locale),
      to: formatDateLong(to, locale),
    })
  } else if (id === 'incomeByCollector') {
    const { date } = params as ReportParams['incomeByCollector']
    subtitle = t('subtitle.date', { date: formatDateLong(date, locale) })
  }

  return { heading, subtitle }
}

/** Everything `renderReportPdf` needs, in the reader's locale. */
export async function reportPdfStrings(
  id: ReportId,
  params: ReportParams[ReportId],
  result: ReportResult,
  locale: string,
): Promise<ReportPdfStrings> {
  const [t, tApp] = await Promise.all([
    getTranslations({ locale, namespace: 'reports' }),
    getTranslations({ locale, namespace: 'app' }),
  ])

  const { heading, subtitle } = await reportHeadings(id, params, result.collectorName, locale)
  const totalKey = reportTotals[id]

  return {
    brand: `${tApp('name')} — ${tApp('tagline')}`,
    heading,
    subtitle,
    generatedOn: t('pdf.generatedOn', { date: formatDateShort(today(), locale) }),
    columns: reportColumns[id].map((column) => t(`columns.${column.key}`)),
    totalLabel: totalKey ? t(`totals.${totalKey}`) : null,
    empty: t('empty'),
    page: (page, total) => t('pdf.page', { page, total }),
  }
}

/**
 * The file a browser saves. Dated so a folder of them stays sortable; the
 * legacy `Output($file, 'I')` named every download `NombreReporte.pdf`, so a
 * second one overwrote the first.
 */
export function reportFileName(id: ReportId) {
  return `centauro-${id}-${today()}.pdf`
}
