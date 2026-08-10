'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormField } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import { formatQCents } from '@/lib/format'

/**
 * Records a payment against a credit. Purely presentational for now — Phase 4
 * swaps the submit handler for a Server Action that appends a ledger row.
 */
export function RecordPaymentDialog({
  creditCode,
  customerName,
  outstanding,
  locale,
}: {
  creditCode: string
  customerName: string
  outstanding: number
  locale: string
}) {
  const t = useTranslations('payments.record')
  const [amount, setAmount] = useState('')

  const parsed = Number(amount)
  const isValid = amount !== '' && !Number.isNaN(parsed) && parsed > 0
  const overpaying = isValid && parsed > outstanding
  const remaining = isValid && !overpaying ? outstanding - parsed : outstanding

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="lg" disabled={outstanding <= 0}>
            <Wallet className="size-4" />
            {t('action')}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('subtitle', { credit: creditCode, customer: customerName })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{t('outstanding')}</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {formatQCents(outstanding, locale)}
            </span>
          </div>

          <FormField label={t('amount')} htmlFor="payment-amount">
            <Input
              id="payment-amount"
              inputMode="decimal"
              placeholder="0.00"
              className="h-10 font-mono"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </FormField>

          <FormField label={t('date')} htmlFor="payment-date">
            <Input id="payment-date" type="date" className="h-10" />
          </FormField>

          {overpaying ? (
            <p className="text-xs text-destructive">{t('overpay')}</p>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('remaining')}</span>
              <span className="font-mono tabular-nums">
                {formatQCents(remaining, locale)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="lg" />}>
            {t('cancel')}
          </DialogClose>
          <Button size="lg" disabled={!isValid || overpaying}>
            {t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
