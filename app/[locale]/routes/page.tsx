import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { SearchInput } from '@/components/search-input'
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
import { formatNumber, formatQ } from '@/lib/format'
import { firstParam, parseSort } from '@/lib/pagination'
import { listRoutes, ROUTE_SORT_KEYS } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function RoutesPage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('routes')
  const tc = await getTranslations('common')

  const query = await searchParams
  const sort = parseSort(firstParam(query.sort), firstParam(query.dir), ROUTE_SORT_KEYS)

  const rows = await listRoutes(sort)

  const totalClients = rows.reduce((sum, row) => sum + row.customerCount, 0)
  const totalPortfolio = rows.reduce((sum, row) => sum + row.portfolio, 0)
  const activeCount = rows.filter((row) => row.active).length

  return (
    <AppShell title={t('title')}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <LinkButton size="lg" href="/routes/new">
            <Plus className="size-4" />
            {t('new')}
          </LinkButton>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label={t('summary.total')} value={formatNumber(rows.length, locale)} />
        <SummaryStat label={t('summary.active')} value={formatNumber(activeCount, locale)} />
        <SummaryStat label={t('summary.clients')} value={formatNumber(totalClients, locale)} />
        <SummaryStat label={t('summary.portfolio')} value={formatQ(totalPortfolio, locale)} />
      </div>

      <Card className="py-0">
        <div className="border-b border-border p-4">
          <SearchInput placeholder={t('searchPlaceholder')} />
        </div>
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
                    label={t('table.route')}
                    sortKey="name"
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
                    label={t('table.clients')}
                    sortKey="clients"
                    current={sort}
                    searchParams={query}
                    align="right"
                    className="text-right"
                  />
                  <SortableHead
                    label={t('table.credits')}
                    sortKey="credits"
                    current={sort}
                    searchParams={query}
                    align="right"
                    className="text-right"
                  />
                  <SortableHead
                    label={t('table.portfolio')}
                    sortKey="portfolio"
                    current={sort}
                    searchParams={query}
                    align="right"
                    className="text-right"
                  />
                  <SortableHead
                    label={tc('status')}
                    sortKey="status"
                    current={sort}
                    searchParams={query}
                  />
                  <TableHead className="pr-4 text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4 font-mono text-xs">{row.code}</TableCell>
                    <TableCell>
                      <Link
                        href={`/routes/${row.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.collectorName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.customerCount}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.activeCredits}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQ(row.portfolio, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.active ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <LinkButton
                        variant="ghost"
                        size="sm"
                        href={`/routes/${row.id}`}
                        >
                        {tc('view')}
                      </LinkButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
