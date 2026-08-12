import { Download } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { ReportForm } from '@/components/reports/report-form'
import { ReportTable } from '@/components/reports/report-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { today } from '@/lib/clock'
import { formatQCents } from '@/lib/format'
import { collectorOptions } from '@/lib/queries/entities'
import { runReport } from '@/lib/queries/reports'
import { reportHeadings } from '@/lib/report-strings'
import { isReportId, parseReportParams, reportDefs } from '@/lib/reports'
import { requireAdmin } from '@/lib/session'

/**
 * The three legacy reports, filtered and generated.
 *
 * `reports.php` held the same three forms behind Bootstrap tabs; each one
 * posted to a `BLL/rpt*.php` endpoint over AJAX and painted a DataTable. Here
 * the filters live in the URL, the listing is server-rendered from it, and the
 * download link carries the same parameters to `/api/reports/[report]` — so
 * what is printed is what is on screen.
 */
export default async function ReportsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/reports'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('reports')
  const query = await searchParams

  const raw = Object.fromEntries(
    Object.entries(query).flatMap(([key, value]) =>
      typeof value === 'string' ? [[key, value] as const] : [],
    ),
  )

  const requested = raw.report && isReportId(raw.report) ? raw.report : null
  const filters = requested ? parseReportParams(requested, raw) : null
  const result = requested && filters ? await runReport(requested, filters) : null

  const collectors = await collectorOptions()
  const asOf = today()
  const monthStart = `${asOf.slice(0, 7)}-01`

  // The PDF route lives outside `app/[locale]/`, so it takes the locale as a
  // parameter rather than a path segment — and it is a plain anchor, not the
  // `next-intl` Link, which would prefix `/en` onto an API path.
  // Built from the *parsed* filters rather than the raw query, so the link
  // carries exactly what produced the table above it and nothing else.
  const downloadHref =
    requested && filters
      ? `/api/reports/${requested}?${new URLSearchParams({
          ...Object.fromEntries(
            Object.entries(filters).map(([key, value]) => [key, String(value)]),
          ),
          locale,
        })}`
      : null

  const headings =
    requested && filters && result
      ? await reportHeadings(requested, filters, result.collectorName, locale)
      : null

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportDefs.map((def) => (
          <ReportForm
            key={def.id}
            id={def.id}
            filters={def.filters}
            collectors={collectors}
            today={asOf}
            monthStart={monthStart}
            active={requested === def.id ? raw : null}
          />
        ))}
      </div>

      {requested && !result && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {filters ? t('notFound') : t('empty')}
          </CardContent>
        </Card>
      )}

      {result && headings && (
        <Card className="py-0">
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">{headings.heading}</h2>
              <p className="text-sm text-muted-foreground">
                {[headings.subtitle, t('rowCount', { count: result.rows.length })]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {result.total && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {t(`totals.${result.total.key}`)}
                  </p>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {formatQCents(result.total.value, locale)}
                  </p>
                </div>
              )}
              <Button
                size="lg"
                nativeButton={false}
                render={
                  <a href={downloadHref ?? '#'} target="_blank" rel="noopener noreferrer" />
                }
              >
                <Download className="size-4" />
                {t('download')}
              </Button>
            </div>
          </div>

          <CardContent className="px-0">
            <ReportTable result={result} locale={locale} />
          </CardContent>
        </Card>
      )}
    </AppShell>
  )
}
