import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { SearchInput } from '@/components/search-input'
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
import {
  collectors,
  collectorPerformance,
  creditsForCollector,
  fullName,
  ledgerEntries,
  routes,
} from '@/lib/mock-data'
import { requireAdmin } from '@/lib/session'

export default async function CollectorsPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('collectors')
  const tc = await getTranslations('common')

  const performance = collectorPerformance()

  const rows = collectors.map((collector) => {
    const own = creditsForCollector(collector.id)
    const live = own.filter((credit) => credit.cancelledAt === null)
    const stats = performance.find((p) => p.collectorId === collector.id)
    const collected = ledgerEntries
      .filter(
        (entry) =>
          entry.kind === 'payment' &&
          !entry.voided &&
          own.some((credit) => credit.id === entry.creditId),
      )
      .reduce((sum, entry) => sum + entry.amount, 0)

    return {
      collector,
      routes: routes.filter((route) => route.collectorId === collector.id),
      clients: new Set(own.map((credit) => credit.customerId)).size,
      activeCredits: live.length,
      portfolio: stats?.portfolio ?? live.reduce((sum, c) => sum + c.outstanding, 0),
      collected,
    }
  })

  const totalPortfolio = rows.reduce((sum, row) => sum + row.portfolio, 0)
  const totalCollected = rows.reduce((sum, row) => sum + row.collected, 0)
  const activeCount = rows.filter((row) => row.collector.active).length

  return (
    <AppShell title={t('title')}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <LinkButton size="lg" href="/collectors/new">
            <Plus className="size-4" />
            {t('new')}
          </LinkButton>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label={t('summary.total')} value={formatNumber(collectors.length, locale)} />
        <SummaryStat label={t('summary.active')} value={formatNumber(activeCount, locale)} />
        <SummaryStat label={t('summary.portfolio')} value={formatQ(totalPortfolio, locale)} />
        <SummaryStat label={t('summary.collected')} value={formatQ(totalCollected, locale)} />
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
                  <TableHead className="pl-4">{t('table.collector')}</TableHead>
                  <TableHead>{t('table.routes')}</TableHead>
                  <TableHead className="text-right">{t('table.clients')}</TableHead>
                  <TableHead className="text-right">{t('table.credits')}</TableHead>
                  <TableHead className="text-right">{t('table.portfolio')}</TableHead>
                  <TableHead className="text-right">{t('table.collected')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="pr-4 text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.collector.id}>
                    <TableCell className="pl-4">
                      <Link
                        href={`/collectors/${row.collector.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                          {row.collector.firstName[0]}
                          {row.collector.lastName[0]}
                        </span>
                        <span>
                          <span className="block font-medium hover:underline">
                            {fullName(row.collector)}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {row.collector.mobile}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.routes.length > 0
                        ? row.routes.map((route) => route.name).join(', ')
                        : tc('none')}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.clients}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.activeCredits}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQ(row.portfolio, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatQ(row.collected, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.collector.active ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <LinkButton
                        variant="ghost"
                        size="sm"
                        href={`/collectors/${row.collector.id}`}
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
