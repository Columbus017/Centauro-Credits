'use client'

import { useActionState, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { FieldError, FormError, invalid } from '@/components/forms/form-errors'
import { FormField } from '@/components/form-field'
import { SelectField, type SelectOption } from '@/components/select-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toastSuccess } from '@/components/ui/toast'
import { formatPercent, formatQCents } from '@/lib/format'
import { createCreditInline, type CreateCreditInlineState } from '@/lib/actions/credits'
import { EMPTY_STATE } from '@/lib/actions/form-state'

export type NewCreditResult = NonNullable<CreateCreditInlineState['credit']>

/**
 * The live-computed capital/total pair from `CreditForm`, isolated here so
 * remounting it (see `openSerial` below) is enough to reset it between opens.
 */
function AmountFields({
  state,
  interestRate,
  locale,
}: {
  state: CreateCreditInlineState
  interestRate: number
  locale: string
}) {
  const t = useTranslations('credits')
  const [principal, setPrincipal] = useState('')
  const parsed = Number(principal)
  const valid = principal !== '' && !Number.isNaN(parsed) && parsed > 0
  const totalDue = valid ? parsed * (1 + interestRate) : 0
  const ratePercent = formatPercent(interestRate * 100, locale)

  return (
    <>
      <FormField label={t('form.principal')} htmlFor="new-credit-principal">
        <Input
          id="new-credit-principal"
          name="principal"
          inputMode="decimal"
          placeholder="0.00"
          className="h-10 font-mono"
          value={principal}
          onChange={(event) => setPrincipal(event.target.value)}
          aria-invalid={invalid(state, 'principal')}
        />
        <FieldError state={state} field="principal" />
      </FormField>

      <FormField label={t('form.computed')} hint={t('form.computedHint', { rate: ratePercent })}>
        <div className="flex h-10 items-center justify-end rounded-lg border border-input bg-muted px-3 font-mono text-sm font-semibold tabular-nums">
          {formatQCents(totalDue, locale)}
        </div>
      </FormField>
    </>
  )
}

/**
 * Same field set as `CreditForm`'s create mode, opened as a modal from within
 * ingreso diario so an admin can add a missing credit without losing the
 * payment rows already entered there.
 *
 * Controlled from the parent — two different triggers (the general "+ Nuevo
 * crédito" button and a row's empty-state search) open this same instance.
 */
export function NewCreditDialog({
  open,
  onOpenChange,
  customers,
  collectorId,
  collectorLabel,
  interestRate,
  today,
  locale,
  prefillCode,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: SelectOption[]
  /** Fixed for this dialog instance — rendered read-only, not a picker. */
  collectorId: string
  collectorLabel: string
  interestRate: number
  today: string
  locale: string
  /** Seeds the código field when opened from a row's empty-state search. */
  prefillCode: string
  onCreated: (credit: NewCreditResult) => void
}) {
  const t = useTranslations('credits')
  const td = useTranslations('dailyClose.form')
  const tc = useTranslations('common')
  const tt = useTranslations('toast')

  const [state, formAction, pending] = useActionState<CreateCreditInlineState, FormData>(
    createCreditInline,
    EMPTY_STATE,
  )

  // Bumped on every closed→open transition and used as the form's `key`, so
  // the código prefill, the client picker and the capital/total fields all
  // start fresh instead of carrying over whatever the previous open left in
  // them — the same remount-to-reset move `SearchableSelect` documents for
  // the daily-close repeater.
  const [seenOpen, setSeenOpen] = useState(open)
  const [openSerial, setOpenSerial] = useState(0)
  if (open !== seenOpen) {
    setSeenOpen(open)
    if (open) setOpenSerial((serial) => serial + 1)
  }

  // Adjusted during render rather than in an effect, so the dialog is never
  // painted open after the credit has already been created — same pattern
  // `new-user-dialog.tsx` uses for `createUser`.
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.ok) onOpenChange(false)
  }

  // A toast and `onCreated` are external side effects, unlike the state
  // adjustment above — they must not run during render, where Strict Mode
  // double-invokes the function body and would fire them twice per submit.
  useEffect(() => {
    if (state.ok && state.credit) {
      toastSuccess(tt('creditCreated'))
      onCreated(state.credit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} key={openSerial}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="collectorId" value={collectorId} />

          <DialogHeader>
            <DialogTitle>{td('newCredit')}</DialogTitle>
            <DialogDescription>
              {td('newCreditDescription', { collector: collectorLabel })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormError state={state} />
            </div>

            <FormField label={t('form.code')} htmlFor="new-credit-code">
              <Input
                id="new-credit-code"
                name="code"
                placeholder="T-0000"
                className="h-10 font-mono"
                defaultValue={prefillCode}
                aria-invalid={invalid(state, 'code')}
              />
              <FieldError state={state} field="code" />
            </FormField>

            <FormField label={t('form.startDate')} htmlFor="new-credit-start-date">
              <Input
                id="new-credit-start-date"
                name="startDate"
                type="date"
                className="h-10"
                defaultValue={today}
                aria-invalid={invalid(state, 'startDate')}
              />
              <FieldError state={state} field="startDate" />
            </FormField>

            <AmountFields state={state} interestRate={interestRate} locale={locale} />

            <FormField label={tc('client')} className="sm:col-span-2">
              <SelectField name="customerId" className="h-10 w-full" options={customers} />
              <FieldError state={state} field="customerId" />
            </FormField>

            <FormField
              label={tc('collector')}
              hint={td('newCreditCollectorHint')}
              className="sm:col-span-2"
            >
              <Input value={collectorLabel} disabled readOnly className="h-10" />
            </FormField>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="lg" type="button" />}>
              {tc('cancel')}
            </DialogClose>
            <Button size="lg" type="submit" disabled={pending}>
              {pending ? tc('saving') : t('form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
