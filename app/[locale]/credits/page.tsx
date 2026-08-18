import { History, Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { ListFilters } from '@/components/list-filters'
import { Pagination } from '@/components/pagination'
import { SortableHead } from '@/components/sortable-head'
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
import { formatDate, formatNumber, formatQ } from '@/lib/format'
import { firstParam, parsePage, parseSort } from '@/lib/pagination'
import { CREDIT_SORT_KEYS, creditPortfolio, listCreditsPage } from '@/lib/queries/credits'
import { requireAdmin } from '@/lib/session'

const STATUSES = ['active', 'cancelled', 'badRecord'] as const

export default async function CreditsPage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('credits')
  const tc = await getTranslations('common')
  const tStatus = await getTranslations('status')

  const query = await searchParams
  const scope = { collectorId: null }
  const status = STATUSES.find((value) => value === firstParam(query.status))
  const filter = { search: firstParam(query.q), status }
  const sort = parseSort(firstParam(query.sort), firstParam(query.dir), CREDIT_SORT_KEYS)

  const [result, portfolio] = await Promise.all([
    listCreditsPage(scope, filter, parsePage(query.page), sort),
    // The tiles describe the live portfolio, not the filtered table.
    creditPortfolio(scope),
  ])
  const rows = result.rows

  return (
    <AppShell title={t('title')}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <LinkButton variant="outline" size="lg" href="/credits/import">
              <History className="size-4" />
              {t('import')}
            </LinkButton>
            <LinkButton size="lg" href="/credits/new">
              <Plus className="size-4" />
              {t('new')}
            </LinkButton>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label={t('summary.capital')} value={formatQ(portfolio.capital, locale)} />
        <SummaryStat label={t('summary.outstanding')} value={formatQ(portfolio.outstanding, locale)} />
        <SummaryStat label={t('summary.active')} value={formatNumber(portfolio.active, locale)} />
        <SummaryStat
          label={t('summary.atRisk')}
          value={formatNumber(portfolio.atRisk, locale)}
          tone={portfolio.atRisk > 0 ? 'danger' : 'default'}
        />
      </div>

      <Card className="py-0">
        <ListFilters
          searchPlaceholder={t('searchPlaceholder')}
          selects={[
            {
              name: 'status',
              allValue: 'all',
              className: 'h-9 min-w-40',
              options: [
                { value: 'all', label: t('allStatuses') },
                ...STATUSES.map((value) => ({ value, label: tStatus(value) })),
              ],
            },
          ]}
        />

        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label={t('table.code')}
                    sortKey="code"
                    current={sort}
                    searchParams={query}
                    className="pl-4"
                  />
                  <SortableHead
                    label={t('table.client')}
                    sortKey="client"
                    current={sort}
                    searchParams={query}
                  />
                  <SortableHead
                    label={t('table.collector')}
                    sortKey="collector"
                    current={sort}
                    searchParams={query}
                  />
                  <SortableHead
                    label={t('table.startDate')}
                    sortKey="startDate"
                    current={sort}
                    searchParams={query}
                  />
                  <SortableHead
                    label={t('table.principal')}
                    sortKey="principal"
                    current={sort}
                    searchParams={query}
                    align="right"
                    className="text-right"
                  />
                  <TableHead className="text-right">{t('table.total')}</TableHead>
                  <TableHead className="text-right">{t('table.payments')}</TableHead>
                  <TableHead className="text-right">{t('table.outstanding')}</TableHead>
                  <TableHead className="pr-4">{tc('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <Link
                        href={`/credits/${row.id}`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {row.code}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/clients/${row.customerId}`} className="hover:underline">
                        {row.customerName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.collectorName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.startDate, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQ(row.principal, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatQ(row.totalDue, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {row.paymentCount}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQ(row.outstanding, locale)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge status={row.status} />
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
