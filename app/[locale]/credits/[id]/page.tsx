import { ArrowLeft, CreditCard, Route as RouteIcon, UserCog } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { RecordPaymentDialog } from '@/components/record-payment-dialog'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
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
import { routing } from '@/i18n/routing'
import { daysBetween, formatDate, formatPercent, formatQ, formatQCents } from '@/lib/format'
import {
  collectorById,
  creditById,
  credits,
  customerById,
  entriesForCredit,
  fullName,
  routeById,
} from '@/lib/mock-data'

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    credits.map((credit) => ({ locale, id: String(credit.id) })),
  )
}

export default async function CreditDetailPage({
  params,
}: PageProps<'/[locale]/credits/[id]'>) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const credit = creditById(Number(id))
  if (!credit) notFound()

  const t = await getTranslations('credits')
  const tc = await getTranslations('common')
  const tPayments = await getTranslations('payments')

  const customer = customerById(credit.customerId)
  const collector = collectorById(credit.collectorId)
  const route = customer ? routeById(customer.routeId) : null
  const customerName = customer ? fullName(customer) : '—'

  // Newest first, matching the legacy statement view.
  const entries = [...entriesForCredit(credit.id)].reverse()

  const paid = credit.totalDue - credit.outstanding
  const progress = credit.totalDue > 0 ? Math.round((paid / credit.totalDue) * 100) : 0

  return (
    <AppShell title={t('detail.title')}>
      <PageHeader
        title={credit.code}
        breadcrumbs={[{ label: t('title'), href: '/credits' }, { label: credit.code }]}
        actions={
          <>
            <Button variant="outline" size="lg" render={<Link href="/credits" />}>
              <ArrowLeft className="size-4" />
              {tc('back')}
            </Button>
            <RecordPaymentDialog
              creditCode={credit.code}
              customerName={customerName}
              outstanding={credit.outstanding}
              locale={locale}
            />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <CreditCard className="size-5" />
        </span>
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/clients/${credit.customerId}`}
              className="font-semibold hover:underline"
            >
              {customerName}
            </Link>
            <StatusBadge status={credit.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <RouteIcon className="size-3.5" />
              {route?.name ?? tc('none')}
            </span>
            <span className="flex items-center gap-1">
              <UserCog className="size-3.5" />
              {collector ? fullName(collector) : tc('none')}
            </span>
            <span>
              {t('detail.disbursedOn')} {formatDate(credit.startDate, locale)}
            </span>
            {credit.cancelledAt && (
              <span>
                {t('detail.daysToPayoff', {
                  days: daysBetween(credit.startDate, credit.cancelledAt),
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('detail.principal')}
          value={formatQ(credit.principal, locale)}
          hint={`${t('detail.interest')} ${formatPercent(credit.interestRate * 100, locale)}`}
        />
        <StatCard label={t('detail.total')} value={formatQ(credit.totalDue, locale)} />
        <StatCard label={t('detail.outstanding')} value={formatQ(credit.outstanding, locale)} />
        <StatCard
          label={t('detail.progress')}
          value={`${progress}%`}
          hint={t('detail.paymentsMade', { count: credit.paymentCount })}
        />
      </div>

      <Card className="py-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold">{t('detail.ledger')}</h2>
            <p className="text-xs text-muted-foreground">{t('detail.ledgerDescription')}</p>
          </div>
        </div>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{tc('date')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                  <TableHead className="text-right">{tc('amount')}</TableHead>
                  <TableHead className="text-right">{t('detail.runningBalance')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="pr-4 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className={entry.voided ? 'opacity-60' : undefined}>
                    <TableCell className="pl-4">{formatDate(entry.entryDate, locale)}</TableCell>
                    <TableCell className="font-medium">
                      {entry.kind === 'origination'
                        ? t('detail.origination')
                        : t('detail.payment')}
                    </TableCell>
                    <TableCell
                      className={
                        entry.kind === 'payment'
                          ? 'text-right font-mono tabular-nums text-success'
                          : 'text-right font-mono tabular-nums'
                      }
                    >
                      {entry.kind === 'payment' ? '−' : ''}
                      {formatQCents(entry.amount, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQCents(entry.runningBalance, locale)}
                    </TableCell>
                    <TableCell>
                      {entry.kind === 'payment' && (
                        <StatusBadge status={entry.voided ? 'voided' : 'posted'} />
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {entry.kind === 'payment' && !entry.voided && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            render={<Link href={`/payments/${entry.id}/receipt`} />}
                          >
                            {tPayments('table.receipt')}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            {t('detail.void')}
                          </Button>
                        </div>
                      )}
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
