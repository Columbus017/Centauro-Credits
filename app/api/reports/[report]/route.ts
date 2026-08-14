import { hasLocale } from 'next-intl'
import type { NextRequest } from 'next/server'

import { renderReportPdf } from '@/components/reports/report-pdf'
import { routing } from '@/i18n/routing'
import { runReport } from '@/lib/queries/reports'
import { reportFileName, reportPdfStrings } from '@/lib/report-strings'
import { isReportId, parseReportParams } from '@/lib/reports'
import { getSessionUser } from '@/lib/session'

/**
 * The PDF endpoint, replacing `ReportsPDF/Credits.php` and
 * `ReportsPDF/CustByCol.php` — and supplying the third document, which the
 * legacy app advertised with an *Imprimir* button and never had.
 *
 * Outside `app/[locale]/` because a PDF is a machine route: the locale arrives
 * as a search param rather than a path segment, and `proxy.ts` deliberately
 * excludes `/api` from locale rewriting.
 *
 * That exclusion also means **layer 1 of the authorization never runs here**.
 * The session check below is not a repeat of the proxy's — it is the only one,
 * which is the whole reason `lib/session.ts` reads the session at the data
 * source. The legacy endpoints had none at all: `BLL/rpt*.php` and
 * `ReportsPDF/*.php` never included `functions/sesiones.php`, so an
 * unauthenticated GET pulled a collector's entire book.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<'/api/reports/[report]'>,
) {
  // `forbidden()` / `unauthorized()` are Server Component interrupts — they
  // render an error boundary, which a route handler has not got. A machine
  // route answers with the status code itself.
  const user = await getSessionUser()
  if (!user) return new Response(null, { status: 401 })
  if (user.role !== 'admin') return new Response(null, { status: 403 })

  const { report } = await context.params
  if (!isReportId(report)) return new Response(null, { status: 404 })

  const raw = Object.fromEntries(request.nextUrl.searchParams)
  const params = parseReportParams(report, raw)
  // Every filter is validated before it reaches a query. The legacy endpoints
  // interpolated `$_POST` straight into SQL — `idCollector` was a raw string
  // in six statements across five files.
  if (!params) return new Response(null, { status: 400 })

  const locale = hasLocale(routing.locales, raw.locale) ? raw.locale : routing.defaultLocale

  const result = await runReport(report, params)
  if (!result) return new Response(null, { status: 404 })

  const strings = await reportPdfStrings(report, params, result, locale)
  const pdf = await renderReportPdf({ result, locale, strings })

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      // Inline, so the browser previews it the way the legacy modal iframe
      // did; the filename is what a save-as writes.
      'Content-Disposition': `inline; filename="${reportFileName(report)}"`,
      // A report is somebody's whole book. Nothing between here and the
      // browser gets to keep a copy.
      'Cache-Control': 'no-store',
    },
  })
}
