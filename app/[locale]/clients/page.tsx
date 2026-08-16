import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { ListFilters } from '@/components/list-filters'
import { Pagination } from '@/components/pagination'
import { StatusBadge } from '@/components/status-badge'
import { SummaryStat } from '@/components/summary-stat'
import { LinkButton } from '@/components/link-button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { formatQ, formatNumber } from '@/lib/format'
import { firstParam, parsePage } from '@/lib/pagination'
import {
  customerSummary,
  listCustomersPage,
  routeOptions,
} from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function ClientsPage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('clients')
  const tc = await getTranslations('common')
  const tStatus = await getTranslations('status')

  const query = await searchParams
  const routeParam = firstParam(query.route)
  const statusParam = firstParam(query.status)
  const filter = {
    search: firstParam(query.q),
    routeId: routeParam ? Number(routeParam) : undefined,
    active: statusParam === 'active' ? true : statusParam === 'inactive' ? false : undefined,
  }

  const [result, summary, routes] = await Promise.all([
    listCustomersPage(filter, parsePage(query.page)),
    // The tiles describe the whole book, not the filtered table.
    customerSummary(),
    // A filter over existing clients, so retired routes belong in it.
    routeOptions({ includeInactive: true }),
  ])
  const rows = result.rows

  return (
    <AppShell title={t('title')}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <LinkButton size="lg" href="/clients/new">
            <Plus className="size-4" />
            {t('new')}
          </LinkButton>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label={t('summary.total')} value={formatNumber(summary.total, locale)} />
        <SummaryStat label={t('summary.active')} value={formatNumber(summary.active, locale)} />
        <SummaryStat
          label={t('summary.atRisk')}
          value={formatNumber(summary.atRisk, locale)}
          tone={summary.atRisk > 0 ? 'danger' : 'default'}
        />
        <SummaryStat label={t('summary.outstanding')} value={formatQ(summary.outstanding, locale)} />
      </div>

      <Card className="py-0">
        <ListFilters
          searchPlaceholder={t('searchPlaceholder')}
          selects={[
            {
              name: 'route',
              allValue: 'all',
              className: 'h-9 min-w-40',
              options: [{ value: 'all', label: t('allRoutes') }, ...routes],
            },
            {
              name: 'status',
              allValue: 'all',
              className: 'h-9 min-w-36',
              options: [
                { value: 'all', label: t('allStatuses') },
                { value: 'active', label: tStatus('active') },
                { value: 'inactive', label: tStatus('inactive') },
              ],
            },
          ]}
        />

        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t('table.client')}</TableHead>
                  <TableHead>{t('table.commerce')}</TableHead>
                  <TableHead>{t('table.route')}</TableHead>
                  <TableHead>{t('table.collector')}</TableHead>
                  <TableHead className="text-right">{t('table.credits')}</TableHead>
                  <TableHead className="text-right">{t('table.balance')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="pr-4 text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <Link href={`/clients/${row.id}`} className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                          {row.firstName[0]}
                          {row.lastName[0]}
                        </span>
                        <span>
                          <span className="block font-medium hover:underline">{row.name}</span>
                          <span className="block font-mono text-xs text-muted-foreground">
                            {row.dpi}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.commerceName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.routeName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.collectorName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.activeCredits}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQ(row.balance, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.active ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <LinkButton
                        variant="ghost"
                        size="sm"
                        href={`/clients/${row.id}`}
                        >
                        {tc('view')}
                      </LinkButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination result={result} searchParams={query} locale={locale} />
        </CardContent>
      </Card>
    </AppShell>
  )
}
