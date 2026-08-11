'use client'

import { useActionState, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { FieldError, FormError, invalid } from '@/components/forms/form-errors'
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
import { dailyCloseCash } from '@/lib/ledger'
import { submitDailyClose } from '@/lib/actions/credits'
import { EMPTY_STATE, type FormState } from '@/lib/actions/form-state'

type PaymentDraft = { key: number; creditId: string; amount: string }

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
  credits,
  today,
  locale,
}: {
  collectors: { value: string; label: string }[]
  /** Live credits, so a payment names a real one rather than free text. */
  credits: { value: string; label: string; collectorId: string }[]
  today: string
  locale: string
}) {
  const t = useTranslations('dailyClose.form')
  const tc = useTranslations('common')
  const uiLocale = useLocale()

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    submitDailyClose,
    EMPTY_STATE,
  )

  const [base, setBase] = useState('')
  const [disbursed, setDisbursed] = useState('')
  const [surplus, setSurplus] = useState('')
  const [nextKey, setNextKey] = useState(2)
  const [collectorId, setCollectorId] = useState(collectors[0]?.value ?? '')

  // Only the chosen collector's book: the action refuses a credit from anyone
  // else's round, and offering one the server will reject is a trap.
  const ownCredits = useMemo(
    () => credits.filter((credit) => credit.collectorId === collectorId),
    [credits, collectorId],
  )

  const [payments, setPayments] = useState<PaymentDraft[]>([
    { key: 1, creditId: '', amount: '' },
  ])

  const collected = useMemo(
    () => payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
    [payments],
  )

  const cash = dailyCloseCash({
    base: toNumber(base),
    collected,
    disbursed: toNumber(disbursed),
    surplus: toNumber(surplus),
  })

  function updatePayment(key: number, patch: Partial<PaymentDraft>) {
    setPayments((current) =>
      current.map((payment) => (payment.key === key ? { ...payment, ...patch } : payment)),
    )
  }

  function addPayment() {
    setPayments((current) => [...current, { key: nextKey, creditId: '', amount: '' }])
    setNextKey((key) => key + 1)
  }

  function removePayment(key: number) {
    setPayments((current) => current.filter((payment) => payment.key !== key))
  }

  // One JSON field for the repeater, as `newIncome.php` posted it.
  const paymentsJson = JSON.stringify(
    payments
      .map((payment) => ({
        // An untouched row shows the first option; that is what it means.
        creditId: payment.creditId || ownCredits[0]?.value || '',
        amount: payment.amount,
      }))
      .filter((payment) => payment.creditId !== '' && payment.amount !== ''),
  )

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3">
      <input type="hidden" name="locale" value={uiLocale} />
      <input type="hidden" name="payments" value={paymentsJson} />

      <div className="space-y-6 lg:col-span-2">
        <FormError state={state} />
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField label={t('collector')}>
              <SelectField
                name="collectorId"
                className="h-10 w-full"
                options={collectors}
                onValueChange={(value) => {
                  setCollectorId(value)
                  // The previous rows point at another collector's credits.
                  setPayments([{ key: nextKey, creditId: '', amount: '' }])
                  setNextKey((key) => key + 1)
                }}
              />
              <FieldError state={state} field="collectorId" />
            </FormField>
            <FormField label={t('date')} htmlFor="close-date">
              <Input
                id="close-date"
                name="closeDate"
                type="date"
                className="h-10"
                defaultValue={today}
                aria-invalid={invalid(state, 'closeDate')}
              />
              <FieldError state={state} field="closeDate" />
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
                  className="flex-1"
                >
                  <SelectField
                    key={`${payment.key}-${collectorId}`}
                    className="h-10 w-full"
                    options={ownCredits}
                    defaultValue={payment.creditId || ownCredits[0]?.value}
                    onValueChange={(creditId) =>
                      updatePayment(payment.key, { creditId })
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
                name="base"
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
                name="disbursed"
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
                name="surplus"
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

            <Button size="lg" type="submit" className="w-full" disabled={pending}>
              {pending ? tc('saving') : t('save')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
