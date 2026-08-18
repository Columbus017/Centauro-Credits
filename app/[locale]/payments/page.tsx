import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { ListFilters } from '@/components/list-filters'
import { PageHeader } from '@/components/page-header'
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
import { formatDate, formatNumber, formatQ, formatQCents } from '@/lib/format'
import { today } from '@/lib/clock'
import { firstParam, parsePage, parseSort } from '@/lib/pagination'
import { collectorOptions } from '@/lib/queries/entities'
import { listPaymentsPage, PAYMENT_SORT_KEYS, paymentSummary } from '@/lib/queries/payments'
import { requireAdmin } from '@/lib/session'

export default async function PaymentsPage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('payments')
  const tc = await getTranslations('common')

  const query = await searchParams
  const scope = { collectorId: null }
  const collectorParam = firstParam(query.collector)
  const filter = {
    search: firstParam(query.q),
    collectorId: collectorParam ? Number(collectorParam) : undefined,
  }

  const sort = parseSort(firstParam(query.sort), firstParam(query.dir), PAYMENT_SORT_KEYS)

  const asOf = today()
  const [result, summary, collectors] = await Promise.all([
    listPaymentsPage(scope, filter, parsePage(query.page), sort),
    paymentSummary(scope, filter, asOf),
    // Retired collectors included: this filters history, not a new record.
    collectorOptions({ includeInactive: true }),
  ])
  const rows = result.rows

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label={t('summary.today')} value={formatQ(summary.collectedToday, locale)} />
        <SummaryStat label={t('summary.count')} value={formatNumber(summary.count, locale)} />
        <SummaryStat label={t('summary.average')} value={formatQ(summary.average, locale)} />
        <SummaryStat
          label={t('summary.voided')}
          value={formatNumber(summary.voided, locale)}
          tone={summary.voided > 0 ? 'danger' : 'default'}
        />
      </div>

      <Card className="py-0">
        <ListFilters
          searchPlaceholder={t('searchPlaceholder')}
          selects={[
            {
              name: 'collector',
              allValue: 'all',
              options: [{ value: 'all', label: t('allCollectors') }, ...collectors],
            },
          ]}
        />

        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label={t('table.date')}
                    sortKey="date"
                    current={sort}
                    searchParams={query}
                    className="pl-4"
                  />
                  <SortableHead
                    label={t('table.credit')}
                    sortKey="credit"
                    current={sort}
                    searchParams={query}
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
                    label={t('table.route')}
                    sortKey="route"
                    current={sort}
                    searchParams={query}
                  />
                  <SortableHead
                    label={t('table.amount')}
                    sortKey="amount"
                    current={sort}
                    searchParams={query}
                    align="right"
                    className="text-right"
                  />
                  <SortableHead
                    label={t('table.balance')}
                    sortKey="balance"
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
                  <TableRow key={row.id} className={row.voided ? 'opacity-60' : undefined}>
                    <TableCell className="pl-4">{formatDate(row.date, locale)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/credits/${row.creditId}`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {row.creditCode}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{row.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.collectorName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.routeName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQCents(row.amount, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatQCents(row.runningBalance, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.voided ? 'voided' : 'posted'} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <LinkButton
                        variant="ghost"
                        size="sm"
                        href={`/payments/${row.id}/receipt`}
                        >
                        {t('table.receipt')}
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
