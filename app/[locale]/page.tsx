import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import {
  AgingChart,
  CashFlowChart,
  CollectorPerformanceChart,
  PortfolioTrendChart,
} from '@/components/dashboard/charts'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { formatDate, formatNumber, formatPercent, formatQ } from '@/lib/format'
import { daysSincePayment, listCredits } from '@/lib/queries/credits'
import {
  agingBuckets,
  collectorPerformance,
  delinquentCredits,
  monthlyCashFlow,
  monthlyTrend,
  portfolioKpis,
} from '@/lib/queries/dashboard'
import { requireAdmin } from '@/lib/session'

export default async function DashboardPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('dashboard')
  const tc = await getTranslations('common')
  const tCredits = await getTranslations('credits')
  const tCollectors = await getTranslations('collectors')

  const [live, kpis, performance, trend, cashFlow] = await Promise.all([
    listCredits({ collectorId: null }, { status: 'active' }),
    portfolioKpis(),
    collectorPerformance(),
    monthlyTrend(),
    monthlyCashFlow(),
  ])

  const atRisk = delinquentCredits(live).sort(
    (a, b) => daysSincePayment(b) - daysSincePayment(a),
  )
  const aging = agingBuckets(live)

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            label={t(`kpi.${kpi.key}`)}
            value={
              kpi.currency
                ? formatQ(kpi.value, locale)
                : kpi.percent
                  ? formatPercent(kpi.value, locale)
                  : formatNumber(kpi.value, locale)
            }
            delta={kpi.delta}
            trend={kpi.trend}
            positiveIsGood={kpi.key !== 'delinquency'}
          />
        ))}
      </div>

      <Tabs defaultValue="portfolio">
        <TabsList>
          <TabsTrigger value="portfolio">{t('tabs.portfolio')}</TabsTrigger>
          <TabsTrigger value="collections">{t('tabs.collections')}</TabsTrigger>
          <TabsTrigger value="delinquency">{t('tabs.delinquency')}</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio">
          <Card>
            <CardHeader>
              <CardTitle>{t('trend.title')}</CardTitle>
              <CardDescription>{t('trend.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <PortfolioTrendChart points={trend} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collections">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('cashFlow.title')}</CardTitle>
                <CardDescription>{t('cashFlow.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <CashFlowChart points={cashFlow} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('collectorPerformance.title')}</CardTitle>
                <CardDescription>{t('collectorPerformance.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <CollectorPerformanceChart rows={performance} />
              </CardContent>
            </Card>

            <Card className="py-0 lg:col-span-2">
              <CardHeader className="pt-6">
                <CardTitle>{tCollectors('title')}</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">{tc('collector')}</TableHead>
                        <TableHead className="text-right">
                          {t('collectorPerformance.clients')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('collectorPerformance.credits')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('collectorPerformance.portfolio')}
                        </TableHead>
                        <TableHead className="pr-6 text-right">
                          {t('collectorPerformance.collected')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performance.map((entry) => (
                        <TableRow key={entry.collectorId}>
                          <TableCell className="pl-6">
                            <Link
                              href={`/collectors/${entry.collectorId}`}
                              className="font-medium hover:underline"
                            >
                              {entry.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {entry.clients}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {entry.activeCredits}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatQ(entry.portfolio, locale)}
                          </TableCell>
                          <TableCell className="pr-6 text-right font-mono tabular-nums">
                            {formatQ(entry.collected, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="delinquency">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('aging.title')}</CardTitle>
                <CardDescription>{t('aging.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <AgingChart buckets={aging} />
              </CardContent>
            </Card>

            <Card className="py-0 lg:col-span-3">
              <CardHeader className="pt-6">
                <CardTitle>{t('atRisk.title')}</CardTitle>
                <CardDescription>{t('atRisk.description')}</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {atRisk.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">{tc('empty')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">{tCredits('table.code')}</TableHead>
                          <TableHead>{tCredits('table.client')}</TableHead>
                          <TableHead>{t('atRisk.lastPayment')}</TableHead>
                          <TableHead className="text-right">{t('atRisk.daysLate')}</TableHead>
                          <TableHead className="pr-6 text-right">
                            {tCredits('table.outstanding')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {atRisk.map((credit) => (
                          <TableRow key={credit.id}>
                            <TableCell className="pl-6">
                              <Link
                                href={`/credits/${credit.id}`}
                                className="font-mono text-xs font-medium hover:underline"
                              >
                                {credit.code}
                              </Link>
                            </TableCell>
                            <TableCell>{credit.customerName}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {credit.lastPaymentDate
                                ? formatDate(credit.lastPaymentDate, locale)
                                : t('atRisk.never')}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-destructive">
                              {daysSincePayment(credit)}
                            </TableCell>
                            <TableCell className="pr-6 text-right font-mono tabular-nums">
                              {formatQ(credit.outstanding, locale)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}
