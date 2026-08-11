'use client'

import { useState } from 'react'
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
import { formatPercent, formatQCents } from '@/lib/format'

type PaymentDraft = { key: number; date: string; amount: string }

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Registers a credit that is already in the field, together with the payments
 * the client has already made. The running balance is recomputed on every
 * keystroke so the operator can see the history reconcile to the real
 * outstanding amount before committing.
 */
export function CreditHistoryForm({
  customers,
  collectors,
  interestRate,
  locale,
}: {
  customers: { value: string; label: string }[]
  collectors: { value: string; label: string }[]
  interestRate: number
  locale: string
}) {
  const t = useTranslations('credits')
  const tc = useTranslations('common')

  const [principal, setPrincipal] = useState('')
  const [nextKey, setNextKey] = useState(2)
  const [payments, setPayments] = useState<PaymentDraft[]>([
    { key: 1, date: '', amount: '' },
  ])

  const totalDue = toNumber(principal) * (1 + interestRate)
  const paid = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const remaining = totalDue - paid
  const overpaid = totalDue > 0 && remaining < 0

  // Balance after each row, so the operator can follow the ledger as it builds.
  const withBalances = payments.reduce<(PaymentDraft & { balance: number })[]>(
    (rows, payment) => {
      const previous = rows.at(-1)?.balance ?? totalDue
      return [...rows, { ...payment, balance: previous - toNumber(payment.amount) }]
    },
    [],
  )

  function updatePayment(key: number, patch: Partial<PaymentDraft>) {
    setPayments((current) =>
      current.map((payment) => (payment.key === key ? { ...payment, ...patch } : payment)),
    )
  }

  return (
    <form className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('form.details')}</CardTitle>
            <CardDescription>
              {t('form.detailsDescription', {
                rate: formatPercent(interestRate * 100, locale),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField label={t('form.code')} htmlFor="import-code">
              <Input id="import-code" placeholder="T-0000" className="h-10 font-mono" />
            </FormField>
            <FormField label={t('form.startDate')} htmlFor="import-start">
              <Input id="import-start" type="date" className="h-10" />
            </FormField>
            <FormField label={t('form.principal')} htmlFor="import-principal">
              <Input
                id="import-principal"
                inputMode="decimal"
                placeholder="0.00"
                className="h-10 text-right font-mono"
                value={principal}
                onChange={(event) => setPrincipal(event.target.value)}
              />
            </FormField>
            <FormField label={t('form.computed')}>
              <div className="flex h-10 items-center justify-end rounded-lg border border-input bg-muted px-3 font-mono text-sm font-semibold tabular-nums">
                {formatQCents(totalDue, locale)}
              </div>
            </FormField>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="pt-6">
            <CardTitle>{t('importPage.history')}</CardTitle>
            <CardDescription>{t('importPage.historyDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-6">
            {withBalances.map((payment, index) => (
              <div key={payment.key} className="flex items-end gap-2">
                <FormField
                  label={index === 0 ? tc('date') : ''}
                  htmlFor={`history-date-${payment.key}`}
                  className="flex-1"
                >
                  <Input
                    id={`history-date-${payment.key}`}
                    type="date"
                    className="h-10"
                    value={payment.date}
                    onChange={(event) =>
                      updatePayment(payment.key, { date: event.target.value })
                    }
                  />
                </FormField>
                <FormField
                  label={index === 0 ? tc('amount') : ''}
                  htmlFor={`history-amount-${payment.key}`}
                  className="w-32"
                >
                  <Input
                    id={`history-amount-${payment.key}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-10 text-right font-mono"
                    value={payment.amount}
                    onChange={(event) =>
                      updatePayment(payment.key, { amount: event.target.value })
                    }
                  />
                </FormField>
                <FormField label={index === 0 ? tc('balance') : ''} className="w-32">
                  <div className="flex h-10 items-center justify-end rounded-lg border border-input bg-muted px-3 font-mono text-sm tabular-nums">
                    {formatQCents(payment.balance, locale)}
                  </div>
                </FormField>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t('importPage.remove')}
                  disabled={payments.length === 1}
                  onClick={() =>
                    setPayments((current) =>
                      current.filter((item) => item.key !== payment.key),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setPayments((current) => [...current, { key: nextKey, date: '', amount: '' }])
                setNextKey((key) => key + 1)
              }}
            >
              <Plus className="size-4" />
              {t('importPage.addPayment')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('form.assignment')}</CardTitle>
            <CardDescription>{t('form.assignmentDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField label={tc('client')}>
              <SelectField
                className="h-10 w-full"
                options={customers}
              />
            </FormField>
            <FormField label={tc('collector')}>
              <SelectField
                className="h-10 w-full"
                options={collectors}
              />
            </FormField>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-medium">{t('importPage.resulting')}</span>
              <span
                className={
                  overpaid
                    ? 'font-mono text-lg font-semibold tabular-nums text-destructive'
                    : 'font-mono text-lg font-semibold tabular-nums'
                }
              >
                {formatQCents(remaining, locale)}
              </span>
            </div>

            <Button size="lg" className="w-full" disabled={overpaid}>
              {t('importPage.save')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
