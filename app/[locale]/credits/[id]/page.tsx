import { ArrowLeft, CreditCard, Route as RouteIcon, UserCog } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { ActionButton } from '@/components/forms/action-button'
import { PageHeader } from '@/components/page-header'
import { RecordPaymentDialog } from '@/components/record-payment-dialog'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
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
import { daysBetween, formatDate, formatPercent, formatQ, formatQCents } from '@/lib/format'
import { getCredit, getCreditLedger } from '@/lib/queries/credits'
import { deleteCredit, voidPayment } from '@/lib/actions/credits'
import { today } from '@/lib/clock'
import { requireUser } from '@/lib/session'

export default async function CreditDetailPage({
  params,
}: PageProps<'/[locale]/credits/[id]'>) {
  const { locale, id } = await params
  setRequestLocale(locale)

  // A collector opens this screen from their round — the legacy
  // `listCreditsOp.php` showed the same ledger in its "Balance de Saldos"
  // modal. Everything that leaves the credit, or changes it, is the admin's.
  const { role, collectorId } = await requireUser()
  const isAdmin = role === 'admin'
  const backHref = isAdmin ? '/credits' : '/field/collect'

  // Reaching the route is not the same as owning the row: the scope goes into
  // the query, so a collector changing the number in the URL gets nothing back
  // rather than another collector's client.
  const credit = await getCredit(Number(id), {
    collectorId: isAdmin ? null : collectorId,
  })
  if (!credit) notFound()

  const t = await getTranslations('credits')
  const tc = await getTranslations('common')
  const tPayments = await getTranslations('payments')
  const tt = await getTranslations('toast')

  const customerName = credit.customerName

  // Newest first, matching the legacy statement view.
  const entries = await getCreditLedger(credit.id)

  const paid = credit.totalDue - credit.outstanding
  const progress = credit.totalDue > 0 ? Math.round((paid / credit.totalDue) * 100) : 0

  return (
    <AppShell title={t('detail.title')}>
      <PageHeader
        title={credit.code}
        // The trail is "Créditos › T-1042", and a collector has no credits
        // list to climb back to — for them the *Regresar* button is the way out.
        breadcrumbs={
          isAdmin
            ? [{ label: t('title'), href: '/credits' }, { label: credit.code }]
            : undefined
        }
        actions={
          <>
            <LinkButton variant="outline" size="lg" href={backHref}>
              <ArrowLeft className="size-4" />
              {tc('back')}
            </LinkButton>
            <RecordPaymentDialog
              creditId={credit.id}
              creditCode={credit.code}
              customerName={customerName}
              outstanding={credit.outstanding}
              today={today()}
              locale={locale}
            />
            {isAdmin && (
              <LinkButton variant="outline" size="lg" href={`/credits/${credit.id}/edit`}>
                {tc('edit')}
              </LinkButton>
            )}
            {isAdmin && (
              <ActionButton
                action={deleteCredit}
                fields={{ id: credit.id }}
                variant="ghost"
                size="lg"
                className="text-destructive"
                confirm={tc('confirmDelete')}
              >
                {tc('delete')}
              </ActionButton>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <CreditCard className="size-5" />
        </span>
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <Link
                href={`/clients/${credit.customerId}`}
                className="font-semibold hover:underline"
              >
                {customerName}
              </Link>
            ) : (
              <span className="font-semibold">{customerName}</span>
            )}
            <StatusBadge status={credit.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <RouteIcon className="size-3.5" />
              {credit.routeName}
            </span>
            <span className="flex items-center gap-1">
              <UserCog className="size-3.5" />
              {credit.collectorName}
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
                  <TableHead>{t('detail.movement')}</TableHead>
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
                          <LinkButton
                            variant="ghost"
                            size="sm"
                            href={`/payments/${entry.id}/receipt`}
                            >
                            {tPayments('table.receipt')}
                          </LinkButton>
                          {isAdmin && (
                            <ActionButton
                              action={voidPayment}
                              fields={{ id: entry.id }}
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              toastMessage={tt('paymentVoided')}
                            >
                              {t('detail.void')}
                            </ActionButton>
                          )}
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
