import { ArrowLeft, IdCard, MapPin, Phone } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { formatDate, formatQ } from '@/lib/format'
import {
  closeCash,
  collectorById,
  collectors,
  creditsForCollector,
  customerById,
  dailyCloses,
  fullName,
  ledgerEntries,
  routes,
} from '@/lib/mock-data'

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    collectors.map((collector) => ({ locale, id: String(collector.id) })),
  )
}

export default async function CollectorDetailPage({
  params,
}: PageProps<'/[locale]/collectors/[id]'>) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const collector = collectorById(Number(id))
  if (!collector) notFound()

  const t = await getTranslations('collectors')
  const tc = await getTranslations('common')
  const tCredits = await getTranslations('credits')
  const tClose = await getTranslations('dailyClose')

  const own = creditsForCollector(collector.id)
  const live = own.filter((credit) => credit.cancelledAt === null)
  const assignedRoutes = routes.filter((route) => route.collectorId === collector.id)
  const closes = dailyCloses
    .filter((close) => close.collectorId === collector.id)
    .sort((a, b) => b.closeDate.localeCompare(a.closeDate))

  const portfolio = live.reduce((sum, credit) => sum + credit.outstanding, 0)
  const collected = ledgerEntries
    .filter(
      (entry) =>
        entry.kind === 'payment' &&
        !entry.voided &&
        own.some((credit) => credit.id === entry.creditId),
    )
    .reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <AppShell title={fullName(collector)}>
      <PageHeader
        title={fullName(collector)}
        breadcrumbs={[
          { label: t('title'), href: '/collectors' },
          { label: fullName(collector) },
        ]}
        actions={
          <Button variant="outline" size="lg" render={<Link href="/collectors" />}>
            <ArrowLeft className="size-4" />
            {tc('back')}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {collector.firstName[0]}
          {collector.lastName[0]}
        </span>
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{fullName(collector)}</span>
            <StatusBadge status={collector.active ? 'active' : 'inactive'} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <IdCard className="size-3.5" />
              {collector.dpi}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" />
              {collector.mobile}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {collector.address}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('table.routes')} value={String(assignedRoutes.length)} />
        <StatCard
          label={t('table.clients')}
          value={String(new Set(own.map((credit) => credit.customerId)).size)}
        />
        <StatCard label={t('table.portfolio')} value={formatQ(portfolio, locale)} />
        <StatCard label={t('table.collected')} value={formatQ(collected, locale)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t('detail.routes')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedRoutes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('detail.noRoutes')}</p>
            ) : (
              assignedRoutes.map((route) => (
                <Link
                  key={route.id}
                  href={`/routes/${route.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <span>
                    <span className="block text-sm font-medium">{route.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {route.code}
                    </span>
                  </span>
                  <StatusBadge status={route.active ? 'active' : 'inactive'} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="py-0 lg:col-span-2">
          <CardHeader className="pt-6">
            <CardTitle>{t('detail.credits')}</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {own.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">{t('detail.noCredits')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">{tCredits('table.code')}</TableHead>
                      <TableHead>{tCredits('table.client')}</TableHead>
                      <TableHead className="text-right">
                        {tCredits('table.outstanding')}
                      </TableHead>
                      <TableHead className="pr-6">{tc('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {own.map((credit) => {
                      const customer = customerById(credit.customerId)
                      return (
                        <TableRow key={credit.id}>
                          <TableCell className="pl-6">
                            <Link
                              href={`/credits/${credit.id}`}
                              className="font-mono text-xs font-medium hover:underline"
                            >
                              {credit.code}
                            </Link>
                          </TableCell>
                          <TableCell>{customer ? fullName(customer) : '—'}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatQ(credit.outstanding, locale)}
                          </TableCell>
                          <TableCell className="pr-6">
                            <StatusBadge status={credit.status} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 py-0">
        <CardHeader className="pt-6">
          <CardTitle>{t('detail.closes')}</CardTitle>
          <CardDescription>{tClose('description')}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {closes.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{t('detail.noCloses')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">{tClose('table.date')}</TableHead>
                    <TableHead className="text-right">{tClose('table.base')}</TableHead>
                    <TableHead className="text-right">{tClose('table.collected')}</TableHead>
                    <TableHead className="text-right">{tClose('table.disbursed')}</TableHead>
                    <TableHead className="text-right">{tClose('table.surplus')}</TableHead>
                    <TableHead className="pr-6 text-right">{tClose('table.cash')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closes.map((close) => (
                    <TableRow key={close.id}>
                      <TableCell className="pl-6">
                        {formatDate(close.closeDate, locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatQ(close.base, locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatQ(close.collected, locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatQ(close.disbursed, locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatQ(close.surplus, locale)}
                      </TableCell>
                      <TableCell className="pr-6 text-right font-mono font-semibold tabular-nums">
                        {formatQ(closeCash(close), locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </AppShell>
  )
}
