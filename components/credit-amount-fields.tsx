'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { FormField } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import { formatPercent, formatQCents } from '@/lib/format'

/**
 * Principal input paired with the derived payoff total. The 15% is applied at
 * origination, so showing the result as the user types is the only way they can
 * confirm the amount before committing.
 */
export function CreditAmountFields({
  interestRate,
  locale,
}: {
  interestRate: number
  locale: string
}) {
  const t = useTranslations('credits.form')
  const [principal, setPrincipal] = useState('')

  const parsed = Number(principal)
  const valid = principal !== '' && !Number.isNaN(parsed) && parsed > 0
  const total = valid ? parsed * (1 + interestRate) : 0
  const ratePercent = formatPercent(interestRate * 100, locale)

  return (
    <>
      <FormField label={t('principal')} htmlFor="principal">
        <Input
          id="principal"
          inputMode="decimal"
          placeholder="0.00"
          className="h-10 font-mono"
          value={principal}
          onChange={(event) => setPrincipal(event.target.value)}
        />
      </FormField>

      <FormField label={t('computed')} hint={t('computedHint', { rate: ratePercent })}>
        <div className="flex h-10 items-center justify-end rounded-lg border border-input bg-muted px-3 font-mono text-sm font-semibold tabular-nums">
          {formatQCents(total, locale)}
        </div>
      </FormField>
    </>
  )
}
