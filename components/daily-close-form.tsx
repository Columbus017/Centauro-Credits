'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { FormField } from '@/components/form-field'
import { SelectField } from '@/components/select-field'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatQCents } from '@/lib/format'

type PaymentDraft = { key: number; code: string; amount: string }

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * The collector's end-of-day cash close. Payments are entered as a batch and
 * the cash figure is derived exactly as the legacy dashboard computed it:
 * `(base + collected) - (disbursed + surplus)`.
 */
export function DailyCloseForm({
  collectors,
  locale,
}: {
  collectors: { id: number; name: string }[]
  locale: string
}) {
  const t = useTranslations('dailyClose.form')
  const tc = useTranslations('common')

  const [base, setBase] = useState('')
  const [disbursed, setDisbursed] = useState('')
  const [surplus, setSurplus] = useState('')
  const [nextKey, setNextKey] = useState(2)
  const [payments, setPayments] = useState<PaymentDraft[]>([
    { key: 1, code: '', amount: '' },
  ])

  const collected = useMemo(
    () => payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
    [payments],
  )

  const cash =
    toNumber(base) + collected - (toNumber(disbursed) + toNumber(surplus))

  function updatePayment(key: number, patch: Partial<PaymentDraft>) {
    setPayments((current) =>
      current.map((payment) => (payment.key === key ? { ...payment, ...patch } : payment)),
    )
  }

  function addPayment() {
    setPayments((current) => [...current, { key: nextKey, code: '', amount: '' }])
    setNextKey((key) => key + 1)
  }

  function removePayment(key: number) {
    setPayments((current) => current.filter((payment) => payment.key !== key))
  }

  return (
    <form className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField label={t('collector')}>
              <SelectField
                className="h-10 w-full"
                options={collectors.map((collector) => ({
                  value: String(collector.id),
                  label: collector.name,
                }))}
              />
            </FormField>
            <FormField label={t('date')} htmlFor="close-date">
              <Input id="close-date" type="date" className="h-10" />
            </FormField>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="pt-6">
            <CardTitle>{t('payments')}</CardTitle>
            <CardDescription>{t('paymentsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-6">
            {payments.map((payment, index) => (
              <div key={payment.key} className="flex items-end gap-2">
                <FormField
                  label={index === 0 ? t('paymentCode') : ''}
                  htmlFor={`code-${payment.key}`}
                  className="flex-1"
                >
                  <Input
                    id={`code-${payment.key}`}
                    placeholder="T-0000"
                    className="h-10 font-mono"
                    value={payment.code}
                    onChange={(event) =>
                      updatePayment(payment.key, { code: event.target.value })
                    }
                  />
                </FormField>
                <FormField
                  label={index === 0 ? tc('amount') : ''}
                  htmlFor={`amount-${payment.key}`}
                  className="w-36"
                >
                  <Input
                    id={`amount-${payment.key}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-10 text-right font-mono"
                    value={payment.amount}
                    onChange={(event) =>
                      updatePayment(payment.key, { amount: event.target.value })
                    }
                  />
                </FormField>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t('remove')}
                  disabled={payments.length === 1}
                  onClick={() => removePayment(payment.key)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="lg" onClick={addPayment}>
              <Plus className="size-4" />
              {t('addPayment')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('cash')}</CardTitle>
            <CardDescription>{t('cashFormula')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField label={t('base')} htmlFor="base" hint={t('baseHint')}>
              <Input
                id="base"
                inputMode="decimal"
                placeholder="0.00"
                className="h-10 text-right font-mono"
                value={base}
                onChange={(event) => setBase(event.target.value)}
              />
            </FormField>

            <FormField label={t('collected')} hint={t('collectedHint')}>
              <div className="flex h-10 items-center justify-end rounded-lg border border-input bg-muted px-3 font-mono text-sm tabular-nums">
                {formatQCents(collected, locale)}
              </div>
            </FormField>

            <FormField label={t('disbursed')} htmlFor="disbursed" hint={t('disbursedHint')}>
              <Input
                id="disbursed"
                inputMode="decimal"
                placeholder="0.00"
                className="h-10 text-right font-mono"
                value={disbursed}
                onChange={(event) => setDisbursed(event.target.value)}
              />
            </FormField>

            <FormField label={t('surplus')} htmlFor="surplus" hint={t('surplusHint')}>
              <Input
                id="surplus"
                inputMode="decimal"
                placeholder="0.00"
                className="h-10 text-right font-mono"
                value={surplus}
                onChange={(event) => setSurplus(event.target.value)}
              />
            </FormField>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-medium">{t('cash')}</span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                {formatQCents(cash, locale)}
              </span>
            </div>

            <Button size="lg" className="w-full">
              {t('save')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
