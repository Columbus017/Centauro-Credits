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
  collectorById,
  creditsForCustomer,
  customersForRoute,
  fullName,
  routes,
} from '@/lib/mock-data'

export default async function RoutesPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('routes')
  const tc = await getTranslations('common')

  const rows = routes.map((route) => {
    const clients = customersForRoute(route.id)
    const live = clients.flatMap((client) =>
      creditsForCustomer(client.id).filter((credit) => credit.cancelledAt === null),
    )
    const collector = collectorById(route.collectorId)

    return {
      route,
      collectorName: collector ? fullName(collector) : tc('none'),
      clients: clients.length,
      activeCredits: live.length,
      portfolio: live.reduce((sum, credit) => sum + credit.outstanding, 0),
    }
  })

  const totalClients = rows.reduce((sum, row) => sum + row.clients, 0)
  const totalPortfolio = rows.reduce((sum, row) => sum + row.portfolio, 0)
  const activeCount = rows.filter((row) => row.route.active).length

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
        <SummaryStat label={t('summary.total')} value={formatNumber(routes.length, locale)} />
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
                  <TableHead className="pl-4">{t('table.code')}</TableHead>
                  <TableHead>{t('table.route')}</TableHead>
                  <TableHead>{t('table.collector')}</TableHead>
                  <TableHead className="text-right">{t('table.clients')}</TableHead>
                  <TableHead className="text-right">{t('table.credits')}</TableHead>
                  <TableHead className="text-right">{t('table.portfolio')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="pr-4 text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.route.id}>
                    <TableCell className="pl-4 font-mono text-xs">{row.route.code}</TableCell>
                    <TableCell>
                      <Link
                        href={`/routes/${row.route.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.route.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.collectorName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.clients}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.activeCredits}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQ(row.portfolio, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.route.active ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <LinkButton
                        variant="ghost"
                        size="sm"
                        href={`/routes/${row.route.id}`}
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
