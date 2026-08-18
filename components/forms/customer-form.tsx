'use client'

import { useActionState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { createCustomer, updateCustomer } from '@/lib/actions/entities'
import { EMPTY_STATE, type FormState } from '@/lib/actions/form-state'

export type CustomerDraft = {
  id: number
  firstName: string
  lastName: string
  dpi: string
  address: string
  mobile: string
  mobile2: string
  routeId: number | null
  commerceId: number | null
}

export function CustomerForm({
  customer,
  routes,
  businesses,
}: {
  customer?: CustomerDraft
  routes: SelectOption[]
  businesses: SelectOption[]
}) {
  const t = useTranslations('clients')
  const tc = useTranslations('common')
  const locale = useLocale()

  const editing = customer !== undefined
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    editing ? updateCustomer : createCustomer,
    EMPTY_STATE,
  )

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('title'), href: '/clients' },
          { label: editing ? tc('edit') : t('form.createTitle') },
        ]}
        title={
          editing
            ? `${tc('edit')} — ${customer.firstName} ${customer.lastName}`
            : t('form.createTitle')
        }
        description={editing ? undefined : t('form.createDescription')}
        actions={
          <>
            <LinkButton
              variant="outline"
              size="lg"
              href={editing ? `/clients/${customer.id}` : '/clients'}
            >
              {tc('cancel')}
            </LinkButton>
            <Button size="lg" type="submit" form="customer-form" disabled={pending}>
              {pending ? tc('saving') : t('form.save')}
            </Button>
          </>
        }
      />

      <FormError state={state} />

      <form id="customer-form" action={formAction} className="grid gap-6 lg:grid-cols-3">
        <input type="hidden" name="locale" value={locale} />
        {editing && <input type="hidden" name="id" value={customer.id} />}

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('form.personal')}</CardTitle>
              <CardDescription>{t('form.personalDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <FormField label={tc('firstName')} htmlFor="firstName">
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Rosa"
                  className="h-10"
                  defaultValue={customer?.firstName}
                  aria-invalid={invalid(state, 'firstName')}
                />
                <FieldError state={state} field="firstName" />
              </FormField>
              <FormField label={tc('lastName')} htmlFor="lastName">
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Martínez"
                  className="h-10"
                  defaultValue={customer?.lastName}
                  aria-invalid={invalid(state, 'lastName')}
                />
                <FieldError state={state} field="lastName" />
              </FormField>
              <FormField
                label={tc('dpi')}
                htmlFor="dpi"
                hint={t('form.dpiHint')}
                className="sm:col-span-2"
              >
                <Input
                  id="dpi"
                  name="dpi"
                  placeholder="0000 00000 0000"
                  className="h-10 font-mono"
                  defaultValue={customer?.dpi}
                  aria-invalid={invalid(state, 'dpi')}
                />
                <FieldError state={state} field="dpi" />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('form.contact')}</CardTitle>
              <CardDescription>{t('form.contactDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <FormField label={tc('mobile')} htmlFor="mobile">
                <Input
                  id="mobile"
                  name="mobile"
                  placeholder="0000 0000"
                  className="h-10"
                  defaultValue={customer?.mobile}
                />
              </FormField>
              <FormField label={tc('mobile2')} htmlFor="mobile2">
                <Input
                  id="mobile2"
                  name="mobile2"
                  placeholder="0000 0000"
                  className="h-10"
                  defaultValue={customer?.mobile2}
                />
              </FormField>
              <FormField label={tc('address')} htmlFor="address" className="sm:col-span-2">
                <Textarea
                  id="address"
                  name="address"
                  rows={3}
                  defaultValue={customer?.address}
                />
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
              <FormField label={tc('route')}>
                <SelectField
                  name="routeId"
                  className="h-10 w-full"
                  options={routes}
                  // `!= null` catches both an unassigned route and a customer
                  // that is not there at all — on the create form there is no
                  // `customer`, and `String(undefined)` is the string
                  // "undefined", which the select then rendered verbatim.
                  defaultValue={
                    customer?.routeId != null ? String(customer.routeId) : undefined
                  }
                />
              </FormField>
              <FormField label={tc('commerce')}>
                <SelectField
                  name="commerceId"
                  className="h-10 w-full"
                  options={businesses}
                  defaultValue={
                    customer?.commerceId != null
                      ? String(customer.commerceId)
                      : undefined
                  }
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  )
}
