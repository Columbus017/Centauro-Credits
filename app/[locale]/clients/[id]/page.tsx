import { ArrowLeft, Building2, MapPin, Phone, Route as RouteIcon, UserCog } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatDate, formatQ, formatQCents } from '@/lib/format'
import {
  collectorById,
  commerceById,
  creditsForCustomer,
  customerById,
  customers,
  fullName,
  ledgerEntries,
  routeById,
} from '@/lib/mock-data'
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    customers.map((customer) => ({ locale, id: String(customer.id) })),
  )
}

export default async function ClientDetailPage({
  params,
}: PageProps<'/[locale]/clients/[id]'>) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const customer = customerById(Number(id))
  if (!customer) notFound()

  const t = await getTranslations('clients')
  const tc = await getTranslations('common')
  const tCredits = await getTranslations('credits')

  const route = routeById(customer.routeId)
  const collector = collectorById(route?.collectorId ?? null)
  const business = commerceById(customer.commerceId)
  const own = creditsForCustomer(customer.id)
  const live = own.filter((c) => c.cancelledAt === null)
  const balance = live.reduce((sum, c) => sum + c.outstanding, 0)

  const payments = ledgerEntries
    .filter(
      (entry) =>
        entry.kind === 'payment' && own.some((credit) => credit.id === entry.creditId),
    )
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.id - a.id)

  const totalPaid = payments
    .filter((entry) => !entry.voided)
    .reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <AppShell title={fullName(customer)}>
      <PageHeader
        title={fullName(customer)}
        breadcrumbs={[{ label: t('title'), href: '/clients' }, { label: fullName(customer) }]}
        actions={
          <Button variant="outline" size="lg" render={<Link href="/clients" />}>
            <ArrowLeft className="size-4" />
            {tc('back')}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {customer.firstName[0]}
          {customer.lastName[0]}
        </span>
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{fullName(customer)}</span>
            <StatusBadge status={customer.active ? 'active' : 'inactive'} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="size-3.5" />
              {business?.name ?? '—'}
            </span>
            <span className="flex items-center gap-1">
              <RouteIcon className="size-3.5" />
              {route?.name ?? tc('none')}
            </span>
            <span className="flex items-center gap-1">
              <UserCog className="size-3.5" />
              {collector ? fullName(collector) : tc('none')}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" />
              {customer.mobile}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {customer.address}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('detail.activeCredits')} value={String(live.length)} />
        <StatCard label={t('detail.totalBalance')} value={formatQ(balance, locale)} />
        <StatCard label={t('detail.totalPaid')} value={formatQ(totalPaid, locale)} />
        <StatCard label={t('detail.since')} value={formatDate(customer.createdAt, locale)} />
      </div>

      <Tabs defaultValue="credits">
        <TabsList>
          <TabsTrigger value="credits">{t('detail.credits')}</TabsTrigger>
          <TabsTrigger value="payments">{t('detail.payments')}</TabsTrigger>
        </TabsList>

        <TabsContent value="credits">
          <Card className="py-0">
            <CardContent className="px-0">
              {own.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">{t('detail.noCredits')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">{tCredits('table.code')}</TableHead>
                        <TableHead>{tCredits('table.startDate')}</TableHead>
                        <TableHead className="text-right">{tCredits('table.principal')}</TableHead>
                        <TableHead className="text-right">{tCredits('table.total')}</TableHead>
                        <TableHead className="text-right">
                          {tCredits('table.outstanding')}
                        </TableHead>
                        <TableHead className="pr-4">{tc('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {own.map((credit) => (
                        <TableRow key={credit.id}>
                          <TableCell className="pl-4">
                            <Link
                              href={`/credits/${credit.id}`}
                              className="font-mono text-xs font-medium hover:underline"
                            >
                              {credit.code}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(credit.startDate, locale)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatQ(credit.principal, locale)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                            {formatQ(credit.totalDue, locale)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatQ(credit.outstanding, locale)}
                          </TableCell>
                          <TableCell className="pr-4">
                            <StatusBadge status={credit.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="py-0">
            <CardHeader className="sr-only">
              <CardTitle>{t('detail.payments')}</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {payments.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">{t('detail.noPayments')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">{tc('date')}</TableHead>
                        <TableHead>{tCredits('table.code')}</TableHead>
                        <TableHead className="text-right">{tc('amount')}</TableHead>
                        <TableHead className="text-right">{tc('balance')}</TableHead>
                        <TableHead className="pr-4">{tc('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((entry) => {
                        const credit = own.find((c) => c.id === entry.creditId)
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="pl-4">
                              {formatDate(entry.entryDate, locale)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {credit?.code ?? '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatQCents(entry.amount, locale)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                              {formatQCents(entry.runningBalance, locale)}
                            </TableCell>
                            <TableCell className="pr-4">
                              <StatusBadge status={entry.voided ? 'voided' : 'posted'} />
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
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}
