'use client'

import { useActionState, useState } from 'react'
import { Wallet } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

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
import { FieldError, FormError } from '@/components/forms/form-errors'
import { FormField } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import { formatQCents } from '@/lib/format'
import { recordPayment } from '@/lib/actions/credits'
import { EMPTY_STATE, type FormState } from '@/lib/actions/form-state'

/**
 * Records a payment against a credit — `BLL/balance.php`, `pago`.
 *
 * The overpayment guard is repeated in the action: this one is here so the
 * operator sees it before submitting, but the ledger is what the server
 * checks, and a stale screen must not be able to take more than is owed.
 */
export function RecordPaymentDialog({
  creditId,
  creditCode,
  customerName,
  outstanding,
  today,
  locale,
}: {
  creditId: number
  creditCode: string
  customerName: string
  outstanding: number
  /** Today in Guatemala, resolved on the server. */
  today: string
  locale: string
}) {
  const t = useTranslations('payments.record')
  const uiLocale = useLocale()
  const [amount, setAmount] = useState('')
  const [open, setOpen] = useState(false)

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    recordPayment,
    EMPTY_STATE,
  )

  const parsed = Number(amount)
  const isValid = amount !== '' && !Number.isNaN(parsed) && parsed > 0
  const overpaying = isValid && parsed > outstanding
  const remaining = isValid && !overpaying ? outstanding - parsed : outstanding

  // `recordPayment` posts and stays put, so the dialog closes itself once the
  // action reports success. Adjusted during render rather than in an effect:
  // the effect version renders the dialog open for a frame after the payment
  // has already gone through, and React re-runs this before painting.
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.ok) {
      setOpen(false)
      setAmount('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="lg" disabled={outstanding <= 0}>
            <Wallet className="size-4" />
            {t('action')}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <input type="hidden" name="locale" value={uiLocale} />
          <input type="hidden" name="creditId" value={creditId} />

          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {t('subtitle', { credit: creditCode, customer: customerName })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <FormError state={state} />

            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
              <span className="text-sm text-muted-foreground">{t('outstanding')}</span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatQCents(outstanding, locale)}
              </span>
            </div>

            <FormField label={t('amount')} htmlFor="payment-amount">
              <Input
                id="payment-amount"
                name="amount"
                inputMode="decimal"
                placeholder="0.00"
                className="h-10 font-mono"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={overpaying || undefined}
              />
              <FieldError state={state} field="amount" />
            </FormField>

            <FormField label={t('date')} htmlFor="payment-date">
              <Input
                id="payment-date"
                name="entryDate"
                type="date"
                className="h-10"
                defaultValue={today}
              />
              <FieldError state={state} field="entryDate" />
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
            <DialogClose render={<Button variant="outline" size="lg" type="button" />}>
              {t('cancel')}
            </DialogClose>
            <Button size="lg" type="submit" disabled={!isValid || overpaying || pending}>
              {t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
