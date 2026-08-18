import { ArrowLeft, UserCog } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { ActionButton } from '@/components/forms/action-button'
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
import { formatNumber, formatQ } from '@/lib/format'
import { getRoute, listCustomersWithPortfolio } from '@/lib/queries/entities'
import { setRouteActive } from '@/lib/actions/entities'
import { requireAdmin } from '@/lib/session'

export default async function RouteDetailPage({
  params,
}: PageProps<'/[locale]/routes/[id]'>) {
  const { locale, id } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const route = await getRoute(Number(id))
  if (!route) notFound()

  const t = await getTranslations('routes')
  const tc = await getTranslations('common')
  const tClients = await getTranslations('clients')
  const tt = await getTranslations('toast')

  // Filtered in the query, not after: this used to load all 511 clients and
  // all 4,737 credits to show the handful on one round.
  const clients = await listCustomersWithPortfolio({ routeId: route.id })

  return (
    <AppShell title={route.name}>
      <PageHeader
        title={route.name}
        breadcrumbs={[{ label: t('title'), href: '/routes' }, { label: route.name }]}
        actions={
          <>
            <LinkButton variant="outline" size="lg" href="/routes">
              <ArrowLeft className="size-4" />
              {tc('back')}
            </LinkButton>
            <ActionButton
              action={setRouteActive}
              fields={{ id: route.id, active: String(!route.active) }}
              size="lg"
              toastMessage={route.active ? tt('routeDeactivated') : tt('routeActivated')}
            >
              {route.active ? tc('deactivate') : tc('activate')}
            </ActionButton>
            <LinkButton size="lg" href={`/routes/${route.id}/edit`}>
              {tc('edit')}
            </LinkButton>
          </>
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
              {route.collectorId ? (
                <Link href={`/collectors/${route.collectorId}`} className="hover:underline">
                  {route.collectorName}
                </Link>
              ) : (
                tc('none')
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('table.clients')} value={formatNumber(route.customerCount, locale)} />
        <StatCard label={t('table.credits')} value={formatNumber(route.activeCredits, locale)} />
        <StatCard label={t('table.portfolio')} value={formatQ(route.portfolio, locale)} />
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
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.commerceName}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatQ(client.balance, locale)}
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
