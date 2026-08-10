import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { SearchInput } from '@/components/search-input'
import { StatusBadge } from '@/components/status-badge'
import { SummaryStat } from '@/components/summary-stat'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  collectorById,
  commerceById,
  creditsForCustomer,
  customerBalance,
  customers,
  daysSincePayment,
  fullName,
  GOOD_RECORD_DAYS,
  routeById,
  routes,
} from '@/lib/mock-data'

export default async function ClientsPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('clients')
  const tc = await getTranslations('common')

  const rows = customers.map((customer) => {
    const route = routeById(customer.routeId)
    const collector = collectorById(route?.collectorId ?? null)
    const own = creditsForCustomer(customer.id)
    const live = own.filter((c) => c.cancelledAt === null)

    return {
      customer,
      commerceName: commerceById(customer.commerceId)?.name ?? '—',
      routeName: route?.name ?? tc('none'),
      collectorName: collector ? fullName(collector) : tc('none'),
      balance: customerBalance(customer.id),
      activeCredits: live.length,
      atRisk: live.some((c) => daysSincePayment(c) > GOOD_RECORD_DAYS),
    }
  })

  const totalBalance = rows.reduce((sum, row) => sum + row.balance, 0)
  const activeCount = rows.filter((row) => row.customer.active).length
  const atRiskCount = rows.filter((row) => row.atRisk).length

  return (
    <AppShell title={t('title')}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button render={<Link href="/clients/new" />} size="lg">
            <Plus className="size-4" />
            {t('new')}
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label={t('summary.total')} value={formatNumber(customers.length, locale)} />
        <SummaryStat label={t('summary.active')} value={formatNumber(activeCount, locale)} />
        <SummaryStat
          label={t('summary.atRisk')}
          value={formatNumber(atRiskCount, locale)}
          tone={atRiskCount > 0 ? 'danger' : 'default'}
        />
        <SummaryStat label={t('summary.outstanding')} value={formatQ(totalBalance, locale)} />
      </div>

      <Card className="py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput placeholder={t('searchPlaceholder')} />
          <div className="flex items-center gap-2">
            <Select defaultValue="all">
              <SelectTrigger size="default" className="h-9 min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allRoutes')}</SelectItem>
                {routes.map((route) => (
                  <SelectItem key={route.id} value={String(route.id)}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger size="default" className="h-9 min-w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="active">{tc('status')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
                  <TableRow key={row.customer.id}>
                    <TableCell className="pl-4">
                      <Link
                        href={`/clients/${row.customer.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                          {row.customer.firstName[0]}
                          {row.customer.lastName[0]}
                        </span>
                        <span>
                          <span className="block font-medium hover:underline">
                            {fullName(row.customer)}
                          </span>
                          <span className="block font-mono text-xs text-muted-foreground">
                            {row.customer.dpi}
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
                      <StatusBadge status={row.customer.active ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/clients/${row.customer.id}`} />}
                      >
                        {tc('view')}
                      </Button>
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
