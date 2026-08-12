import { ArrowLeft, Building2, MapPin, Phone, Route as RouteIcon, UserCog } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { ActionButton } from '@/components/forms/action-button'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { LinkButton } from '@/components/link-button'
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
import { listCredits } from '@/lib/queries/credits'
import { getCustomer } from '@/lib/queries/entities'
import { listPayments } from '@/lib/queries/payments'
import { setCustomerActive } from '@/lib/actions/entities'
import { requireAdmin } from '@/lib/session'

export default async function ClientDetailPage({
  params,
}: PageProps<'/[locale]/clients/[id]'>) {
  const { locale, id } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const customer = await getCustomer(Number(id))
  if (!customer) notFound()

  const t = await getTranslations('clients')
  const tc = await getTranslations('common')
  const tCredits = await getTranslations('credits')

  const [own, payments] = await Promise.all([
    listCredits({ collectorId: null }, { customerId: customer.id }),
    listPayments({ collectorId: null }, { customerId: customer.id }),
  ])
  const live = own.filter((credit) => credit.cancelledAt === null)
  const balance = live.reduce((sum, credit) => sum + credit.outstanding, 0)

  const totalPaid = payments
    .filter((payment) => !payment.voided)
    .reduce((sum, payment) => sum + payment.amount, 0)

  // "Client since" is the day of their first credit, not the row's `created_at`:
  // the legacy `customer` table records no creation date, so after the ETL every
  // migrated client would otherwise claim to have joined on the migration day.
  const since =
    own.map((credit) => credit.startDate).sort()[0] ?? customer.createdAt

  return (
    <AppShell title={customer.name}>
      <PageHeader
        title={customer.name}
        breadcrumbs={[{ label: t('title'), href: '/clients' }, { label: customer.name }]}
        actions={
          <>
            <LinkButton variant="outline" size="lg" href="/clients">
              <ArrowLeft className="size-4" />
              {tc('back')}
            </LinkButton>
            <ActionButton
              action={setCustomerActive}
              fields={{ id: customer.id, active: String(!customer.active) }}
              size="lg"
            >
              {customer.active ? tc('deactivate') : tc('activate')}
            </ActionButton>
            <LinkButton size="lg" href={`/clients/${customer.id}/edit`}>
              {tc('edit')}
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {customer.firstName[0]}
          {customer.lastName[0]}
        </span>
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{customer.name}</span>
            <StatusBadge status={customer.active ? 'active' : 'inactive'} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="size-3.5" />
              {customer.commerceName}
            </span>
            <span className="flex items-center gap-1">
              <RouteIcon className="size-3.5" />
              {customer.routeName}
            </span>
            <span className="flex items-center gap-1">
              <UserCog className="size-3.5" />
              {customer.collectorName}
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
        <StatCard label={t('detail.since')} value={formatDate(since, locale)} />
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
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="pl-4">
                            {formatDate(payment.date, locale)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {payment.creditCode}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatQCents(payment.amount, locale)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                            {formatQCents(payment.runningBalance, locale)}
                          </TableCell>
                          <TableCell className="pr-4">
                            <StatusBadge status={payment.voided ? 'voided' : 'posted'} />
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
      </Tabs>
    </AppShell>
  )
}
