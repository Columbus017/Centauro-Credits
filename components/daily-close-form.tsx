'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { FieldError, FormError, invalid } from '@/components/forms/form-errors'
import { FormField } from '@/components/form-field'
import { NewCreditDialog, type NewCreditResult } from '@/components/new-credit-dialog'
import { SelectField, type SelectOption } from '@/components/select-field'
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

type PaymentDraft = {
  key: number
  creditId: string
  amount: string
  /**
   * Bumped only when `creditId` is set *programmatically* (a credit created
   * from the dialog auto-selected into an already-mounted row) — folded into
   * the row's `SelectField` `key` so that one case remounts it to pick up the
   * new `defaultValue`. A manual pick through the combobox itself needs no
   * remount: Base UI already reflects it without one.
   */
  selectSerial: number
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

// Only the "Guardar" button submits — Enter here has no row to add, so it is
// simply swallowed rather than triggering an implicit submit.
function swallowEnter(event: React.KeyboardEvent) {
  if (event.key === 'Enter') event.preventDefault()
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
  customers,
  interestRate,
}: {
  collectors: { value: string; label: string }[]
  /** Live credits, so a payment names a real one rather than free text. */
  credits: { value: string; label: string; detail: string; collectorId: string }[]
  today: string
  locale: string
  /** Existing clients, for the "+ Nuevo crédito" dialog. */
  customers: SelectOption[]
  /** For the dialog's live total-a-pagar calculation. */
  interestRate: number
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
  // Which row to focus on mount. `null` on first render: the form opening is
  // not the operator asking for a payment row.
  const [focusKey, setFocusKey] = useState<number | null>(null)
  // Mirrors `focusKey`, but drives the amount field's `autoFocus` for a row
  // that is created already carrying a credit — `focusKey` still owns the
  // "operator asked for a blank row" case.
  const [amountFocusKey, setAmountFocusKey] = useState<number | null>(null)
  const [collectorId, setCollectorId] = useState(collectors[0]?.value ?? '')

  // Credits created from the dialog mid-close, kept in local state rather
  // than relying solely on the server-fetched `credits` prop catching up:
  // the automatic post-action route refresh is real, but its timing relative
  // to `onCreated` firing is not something a same-interaction auto-select
  // should depend on.
  const [extraCredits, setExtraCredits] = useState<typeof credits>([])
  const [creditDialog, setCreditDialog] = useState<{
    open: boolean
    /** `null` when opened from the general "+ Nuevo crédito" button. */
    forRowKey: number | null
    prefillCode: string
  }>({ open: false, forRowKey: null, prefillCode: '' })

  const collectorFieldRef = useRef<HTMLElement>(null)
  const closeDateRef = useRef<HTMLInputElement>(null)
  const baseRef = useRef<HTMLInputElement>(null)
  const disbursedRef = useRef<HTMLInputElement>(null)
  const surplusRef = useRef<HTMLInputElement>(null)

  // Keyed by `payment.key`, not index — a row's identity survives its
  // neighbors being added or removed.
  const creditFieldRefs = useRef(new Map<number, HTMLElement>())
  const amountInputRefs = useRef(new Map<number, HTMLInputElement>())

  // All known credits, newest-created included, one entry per id — a credit
  // created mid-close and picked up moments later by the route refresh must
  // not render twice in the same list.
  const allCredits = useMemo(() => {
    const seen = new Set<string>()
    return [...credits, ...extraCredits].filter((credit) => {
      if (seen.has(credit.value)) return false
      seen.add(credit.value)
      return true
    })
  }, [credits, extraCredits])

  // Only the chosen collector's book: the action refuses a credit from anyone
  // else's round, and offering one the server will reject is a trap.
  const ownCredits = useMemo(
    () => allCredits.filter((credit) => credit.collectorId === collectorId),
    [allCredits, collectorId],
  )

  const collectorLabel = collectors.find((collector) => collector.value === collectorId)?.label ?? ''

  const [payments, setPayments] = useState<PaymentDraft[]>([
    { key: 1, creditId: '', amount: '', selectSerial: 0 },
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
    setPayments((current) => [
      ...current,
      { key: nextKey, creditId: '', amount: '', selectSerial: 0 },
    ])
    // The row the operator just asked for takes the caret, so the card number
    // can be typed without reaching for the mouse again.
    setFocusKey(nextKey)
    setNextKey((key) => key + 1)
  }

  /**
   * Resolves the row a credit created from the dialog lands in — the row
   * that triggered it, else an existing empty row, else a freshly appended
   * one — and moves focus to that row's amount field.
   */
  function handleCreditCreated(credit: NewCreditResult) {
    setExtraCredits((current) => [...current, credit])

    const triggeringRow =
      creditDialog.forRowKey !== null
        ? payments.find((payment) => payment.key === creditDialog.forRowKey)
        : undefined
    const emptyRow = payments.find(
      (payment) => payment.creditId === '' && payment.amount.trim() === '',
    )
    const target = triggeringRow ?? emptyRow

    if (target) {
      setPayments((current) =>
        current.map((payment) =>
          payment.key === target.key
            ? { ...payment, creditId: credit.value, selectSerial: payment.selectSerial + 1 }
            : payment,
        ),
      )
      // The row is already mounted, so a ref is already there to focus.
      amountInputRefs.current.get(target.key)?.focus()
    } else {
      const key = nextKey
      setPayments((current) => [
        ...current,
        { key, creditId: credit.value, amount: '', selectSerial: 0 },
      ])
      setNextKey((value) => value + 1)
      // The row doesn't exist yet — `autoFocus` claims it once it mounts.
      setAmountFocusKey(key)
    }
  }

  function removePayment(key: number) {
    const removedIndex = payments.findIndex((payment) => payment.key === key)
    const remaining = payments.filter((payment) => payment.key !== key)
    setPayments(remaining)
    // The trash button is disabled at one row, so `remaining` is never empty
    // here — a neighbor always exists to take focus.
    const targetKey = remaining[Math.max(0, removedIndex - 1)]?.key
    if (targetKey !== undefined) {
      amountInputRefs.current.get(targetKey)?.focus()
    }
  }

  // One JSON field for the repeater, as `newIncome.php` posted it.
  const paymentsJson = JSON.stringify(
    payments
      .map((payment) => ({ creditId: payment.creditId, amount: payment.amount }))
      .filter((payment) => payment.creditId !== '' && payment.amount !== ''),
  )

  /**
   * A row carrying money but naming no credit.
   *
   * This has to stop the submit rather than fall through: `collected` above is
   * summed from every row, while `paymentsJson` drops the incomplete ones, so
   * letting it through would store a cash figure the ledger entries do not add
   * up to — and posting the payment against whichever credit sorted first, as
   * this form used to, is worse still.
   */
  const missingCredit = payments.some(
    (payment) => payment.amount.trim() !== '' && payment.creditId === '',
  )
  const [creditErrorShown, setCreditErrorShown] = useState(false)
  // Derived, so the banner clears itself the moment the row is completed.
  const creditError = creditErrorShown && missingCredit

  // Only reachable after a real round trip: the client-side `missingCredit`
  // check above calls `preventDefault()`, so the two never fire together.
  useEffect(() => {
    const fieldErrors = state.fieldErrors
    if (!fieldErrors) return
    if (fieldErrors.collectorId) {
      collectorFieldRef.current?.focus()
    } else if (fieldErrors.closeDate) {
      closeDateRef.current?.focus()
    } else if (fieldErrors.base) {
      baseRef.current?.focus()
    } else if (fieldErrors.disbursed) {
      disbursedRef.current?.focus()
    } else if (fieldErrors.surplus) {
      surplusRef.current?.focus()
    }
  }, [state.fieldErrors])

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (missingCredit) {
          event.preventDefault()
          setCreditErrorShown(true)
          const offendingRow = payments.find(
            (payment) => payment.amount.trim() !== '' && payment.creditId === '',
          )
          if (offendingRow) {
            creditFieldRefs.current.get(offendingRow.key)?.focus()
          }
        }
      }}
      className="grid gap-6 lg:grid-cols-3"
    >
      <input type="hidden" name="locale" value={uiLocale} />
      <input type="hidden" name="payments" value={paymentsJson} />

      <div className="space-y-6 lg:col-span-2">
        {/* The client-side block borrows the action's own error contract, so
            both kinds of failure look the same to the operator. */}
        <FormError state={creditError ? { error: 'creditRequired' } : state} />
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
                ref={collectorFieldRef}
                onValueChange={(value) => {
                  setCollectorId(value)
                  // The previous rows point at another collector's credits.
                  setPayments([{ key: nextKey, creditId: '', amount: '', selectSerial: 0 }])
                  // Same reasoning as `addPayment`: the resulting blank row
                  // takes the caret, same as one the operator asked for.
                  setFocusKey(nextKey)
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
                ref={closeDateRef}
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
                    key={`${payment.key}-${collectorId}-${payment.selectSerial}`}
                    className="h-10 w-full"
                    options={ownCredits}
                    // No fallback to the first credit: a row nobody touched is
                    // unselected, and says so.
                    defaultValue={payment.creditId || undefined}
                    autoFocus={payment.key === focusKey}
                    onValueChange={(creditId) => {
                      updatePayment(payment.key, { creditId })
                      // One Tab saved per row: the amount is what the
                      // operator types next anyway.
                      amountInputRefs.current.get(payment.key)?.focus()
                    }}
                    emptyActionLabel={t('createCreditAction')}
                    onEmptyAction={(query) =>
                      setCreditDialog({ open: true, forRowKey: payment.key, prefillCode: query })
                    }
                    ref={(el) => {
                      if (el) creditFieldRefs.current.set(payment.key, el)
                      else creditFieldRefs.current.delete(payment.key)
                    }}
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
                    autoFocus={payment.key === amountFocusKey}
                    onChange={(event) =>
                      updatePayment(payment.key, { amount: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addPayment()
                      }
                    }}
                    ref={(el) => {
                      if (el) amountInputRefs.current.set(payment.key, el)
                      else amountInputRefs.current.delete(payment.key)
                    }}
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

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={addPayment}>
                <Plus className="size-4" />
                {t('addPayment')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setCreditDialog({ open: true, forRowKey: null, prefillCode: '' })}
              >
                <Plus className="size-4" />
                {t('newCredit')}
              </Button>
            </div>
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
                onKeyDown={swallowEnter}
                ref={baseRef}
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
                onKeyDown={swallowEnter}
                ref={disbursedRef}
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
                onKeyDown={swallowEnter}
                ref={surplusRef}
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

      <NewCreditDialog
        open={creditDialog.open}
        onOpenChange={(open) => setCreditDialog((current) => ({ ...current, open }))}
        customers={customers}
        collectorId={collectorId}
        collectorLabel={collectorLabel}
        interestRate={interestRate}
        today={today}
        locale={uiLocale}
        prefillCode={creditDialog.prefillCode}
        onCreated={handleCreditCreated}
      />
    </form>
  )
}
