import { ArrowLeft, UserCog } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { LinkButton } from '@/components/link-button'
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
import { formatNumber, formatQ } from '@/lib/format'
import {
  collectorById,
  commerceById,
  creditsForCustomer,
  customerBalance,
  customersForRoute,
  fullName,
  routeById,
  routes,
} from '@/lib/mock-data'

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    routes.map((route) => ({ locale, id: String(route.id) })),
  )
}

export default async function RouteDetailPage({
  params,
}: PageProps<'/[locale]/routes/[id]'>) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const route = routeById(Number(id))
  if (!route) notFound()

  const t = await getTranslations('routes')
  const tc = await getTranslations('common')
  const tClients = await getTranslations('clients')

  const collector = collectorById(route.collectorId)
  const clients = customersForRoute(route.id)
  const live = clients.flatMap((client) =>
    creditsForCustomer(client.id).filter((credit) => credit.cancelledAt === null),
  )
  const portfolio = live.reduce((sum, credit) => sum + credit.outstanding, 0)

  return (
    <AppShell title={route.name}>
      <PageHeader
        title={route.name}
        breadcrumbs={[{ label: t('title'), href: '/routes' }, { label: route.name }]}
        actions={
          <LinkButton variant="outline" size="lg" href="/routes">
            <ArrowLeft className="size-4" />
            {tc('back')}
          </LinkButton>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent font-mono text-sm font-semibold text-accent-foreground">
          {route.code}
        </span>
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{route.name}</span>
            <StatusBadge status={route.active ? 'active' : 'inactive'} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserCog className="size-3.5" />
              {collector ? (
                <Link href={`/collectors/${collector.id}`} className="hover:underline">
                  {fullName(collector)}
                </Link>
              ) : (
                tc('none')
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('table.clients')} value={formatNumber(clients.length, locale)} />
        <StatCard label={t('table.credits')} value={formatNumber(live.length, locale)} />
        <StatCard label={t('table.portfolio')} value={formatQ(portfolio, locale)} />
      </div>

      {route.details && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('detail.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{route.details}</p>
          </CardContent>
        </Card>
      )}

      <Card className="py-0">
        <CardHeader className="pt-6">
          <CardTitle>{t('detail.clients')}</CardTitle>
          <CardDescription>{tClients('description')}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {clients.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{t('detail.noClients')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">{tClients('table.client')}</TableHead>
                    <TableHead>{tClients('table.commerce')}</TableHead>
                    <TableHead className="text-right">{tClients('table.balance')}</TableHead>
                    <TableHead className="pr-6">{tc('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="pl-6">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium hover:underline"
                        >
                          {fullName(client)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {commerceById(client.commerceId)?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatQ(customerBalance(client.id), locale)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <StatusBadge status={client.active ? 'active' : 'inactive'} />
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
