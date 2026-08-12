'use client'

import { useActionState, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { FieldError, FormError, invalid } from '@/components/forms/form-errors'
import { FormField } from '@/components/form-field'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
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
import { formatPercent, formatQCents } from '@/lib/format'
import { createCredit, updateCredit } from '@/lib/actions/credits'
import { EMPTY_STATE, type FormState } from '@/lib/actions/form-state'

export type CreditDraft = {
  id: number
  code: string
  startDate: string
  principal: number
  customerId: number
  collectorId: number
}

/**
 * Ports `newCredit.php` / `editCredit.php`.
 *
 * Editing the principal moves the origination row and re-derives every later
 * balance, so the form warns before it is submitted.
 */
export function CreditForm({
  credit,
  customers,
  collectors,
  interestRate,
  today,
  locale,
}: {
  credit?: CreditDraft
  customers: SelectOption[]
  collectors: SelectOption[]
  interestRate: number
  today: string
  locale: string
}) {
  const t = useTranslations('credits')
  const tc = useTranslations('common')
  const uiLocale = useLocale()

  const editing = credit !== undefined
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    editing ? updateCredit : createCredit,
    EMPTY_STATE,
  )

  const [principal, setPrincipal] = useState(
    credit ? String(credit.principal) : '',
  )
  const parsed = Number(principal)
  const valid = principal !== '' && !Number.isNaN(parsed) && parsed > 0
  const totalDue = valid ? parsed * (1 + interestRate) : 0
  const ratePercent = formatPercent(interestRate * 100, locale)

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('title'), href: '/credits' },
          { label: editing ? tc('edit') : t('form.createTitle') },
        ]}
        title={editing ? `${tc('edit')} — ${credit.code}` : t('form.createTitle')}
        description={editing ? t('form.editDescription') : t('form.createDescription')}
        actions={
          <>
            <LinkButton
              variant="outline"
              size="lg"
              href={editing ? `/credits/${credit.id}` : '/credits'}
            >
              {tc('cancel')}
            </LinkButton>
            <Button size="lg" type="submit" form="credit-form" disabled={pending}>
              {pending ? tc('saving') : t('form.save')}
            </Button>
          </>
        }
      />

      <FormError state={state} />

      <form id="credit-form" action={formAction} className="grid gap-6 lg:grid-cols-3">
        <input type="hidden" name="locale" value={uiLocale} />
        {editing && <input type="hidden" name="id" value={credit.id} />}

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('form.details')}</CardTitle>
              <CardDescription>
                {t('form.detailsDescription', { rate: ratePercent })}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <FormField label={t('form.code')} htmlFor="code">
                <Input
                  id="code"
                  name="code"
                  placeholder="T-0000"
                  className="h-10 font-mono"
                  defaultValue={credit?.code}
                  aria-invalid={invalid(state, 'code')}
                />
                <FieldError state={state} field="code" />
              </FormField>
              <FormField label={t('form.startDate')} htmlFor="startDate">
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  className="h-10"
                  defaultValue={credit?.startDate ?? today}
                  aria-invalid={invalid(state, 'startDate')}
                />
                <FieldError state={state} field="startDate" />
              </FormField>

              <FormField label={t('form.principal')} htmlFor="principal">
                <Input
                  id="principal"
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

              <FormField
                label={t('form.computed')}
                hint={t('form.computedHint', { rate: ratePercent })}
              >
                <div className="flex h-10 items-center justify-end rounded-lg border border-input bg-muted px-3 font-mono text-sm font-semibold tabular-nums">
                  {formatQCents(totalDue, locale)}
                </div>
              </FormField>
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
                  name="customerId"
                  className="h-10 w-full"
                  options={customers}
                  defaultValue={credit ? String(credit.customerId) : undefined}
                />
                <FieldError state={state} field="customerId" />
              </FormField>
              <FormField label={tc('collector')}>
                <SelectField
                  name="collectorId"
                  className="h-10 w-full"
                  options={collectors}
                  defaultValue={credit ? String(credit.collectorId) : undefined}
                />
                <FieldError state={state} field="collectorId" />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  )
}
