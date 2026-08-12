import { ArrowLeft, Landmark } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PrintButton } from '@/components/print-button'
import { LinkButton } from '@/components/link-button'
import { formatDate, formatQCents } from '@/lib/format'
import { getPayment } from '@/lib/queries/payments'
import { requireUser } from '@/lib/session'

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono tabular-nums' : undefined}>{value}</span>
    </div>
  )
}

export default async function ReceiptPage({
  params,
}: PageProps<'/[locale]/payments/[id]/receipt'>) {
  const { locale, id } = await params
  setRequestLocale(locale)

  // Both roles reach this screen. `/payments` is an admin list, so the way
  // back for a collector is their own day.
  const { role, collectorId } = await requireUser()
  const isAdmin = role === 'admin'
  const backHref = isAdmin ? '/payments' : '/field/today'

  // A receipt names a client and an amount, so the scope goes into the query:
  // a collector can only load one written against a credit on their own round.
  const payment = await getPayment(Number(id), {
    collectorId: isAdmin ? null : collectorId,
  })
  if (!payment) notFound()

  const t = await getTranslations('payments')
  const tc = await getTranslations('common')
  const tApp = await getTranslations('app')

  const previousBalance = payment.runningBalance + payment.amount

  return (
    <AppShell title={t('receipt.title')}>
      <div className="no-print mb-6 flex items-center justify-between">
        <LinkButton variant="outline" size="lg" href={backHref}>
          <ArrowLeft className="size-4" />
          {tc('back')}
        </LinkButton>
        <PrintButton />
      </div>

      <div className="print-area mx-auto max-w-md rounded-xl bg-card p-8 ring-1 ring-foreground/10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2.5 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="size-5" />
          </div>
          <div className="text-base font-semibold">{tApp('name')}</div>
          <div className="text-xs text-muted-foreground">{t('receipt.title')}</div>
        </div>

        {payment.voided && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs font-medium text-destructive">
            {t('receipt.voided')}
          </p>
        )}

        <div className="my-4 space-y-2 border-y border-dashed border-border py-4">
          <Row label={t('receipt.number')} value={`R-${String(payment.id).padStart(5, '0')}`} mono />
          <Row label={tc('date')} value={formatDate(payment.date, locale)} mono />
          <Row label={t('receipt.issuedTo')} value={payment.customerName} />
          <Row label={t('table.credit')} value={payment.creditCode} mono />
          <Row
            label={t('receipt.concept')}
            value={t('receipt.conceptValue', { credit: payment.creditCode })}
          />
        </div>

        <div className="space-y-2">
          <Row
            label={t('receipt.previousBalance')}
            value={formatQCents(previousBalance, locale)}
            mono
          />
          <Row
            label={t('receipt.newBalance')}
            value={formatQCents(payment.runningBalance, locale)}
            mono
          />
        </div>

        <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold">
          <span>{t('receipt.amount')}</span>
          <span className="font-mono tabular-nums">{formatQCents(payment.amount, locale)}</span>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          {t('receipt.collectedBy')} {payment.collectorName} · {payment.routeName}
          <br />
          {t('receipt.footer')}
        </p>
      </div>
    </AppShell>
  )
}
