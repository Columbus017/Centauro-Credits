'use client'

import { useActionState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { FieldError, FormError, invalid } from '@/components/forms/form-errors'
import { FormField } from '@/components/form-field'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
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
import { createCollector, updateCollector } from '@/lib/actions/entities'
import { EMPTY_STATE, type FormState } from '@/lib/actions/form-state'

export type CollectorDraft = {
  id: number
  firstName: string
  lastName: string
  dpi: string
  mobile: string
  address: string
  birthDate: string | null
}

/**
 * Create and edit are the same fields, so they are the same form — the legacy
 * app kept `newCollector.php` and `editCollector.php` as separate copies and
 * they drifted apart in their validation.
 */
export function CollectorForm({ collector }: { collector?: CollectorDraft }) {
  const t = useTranslations('collectors')
  const tc = useTranslations('common')
  const locale = useLocale()

  const editing = collector !== undefined
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    editing ? updateCollector : createCollector,
    EMPTY_STATE,
  )

  const title = editing ? collector.firstName : t('form.createTitle')

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('title'), href: '/collectors' },
          { label: editing ? tc('edit') : t('form.createTitle') },
        ]}
        title={editing ? `${tc('edit')} — ${title}` : t('form.createTitle')}
        description={editing ? undefined : t('form.createDescription')}
        actions={
          <>
            <LinkButton
              variant="outline"
              size="lg"
              href={editing ? `/collectors/${collector.id}` : '/collectors'}
            >
              {tc('cancel')}
            </LinkButton>
            {/* The submit sits in the header, outside the form element, so it
                has to name the form it belongs to. */}
            <Button size="lg" type="submit" form="collector-form" disabled={pending}>
              {pending ? tc('saving') : t('form.save')}
            </Button>
          </>
        }
      />

      <FormError state={state} />

      <form id="collector-form" action={formAction} className="grid gap-6 lg:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        {editing && <input type="hidden" name="id" value={collector.id} />}

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
                placeholder="Carlos"
                className="h-10"
                defaultValue={collector?.firstName}
                aria-invalid={invalid(state, 'firstName')}
              />
              <FieldError state={state} field="firstName" />
            </FormField>
            <FormField label={tc('lastName')} htmlFor="lastName">
              <Input
                id="lastName"
                name="lastName"
                placeholder="Mejía"
                className="h-10"
                defaultValue={collector?.lastName}
                aria-invalid={invalid(state, 'lastName')}
              />
              <FieldError state={state} field="lastName" />
            </FormField>
            <FormField label={tc('dpi')} htmlFor="dpi">
              <Input
                id="dpi"
                name="dpi"
                placeholder="0000 00000 0000"
                className="h-10 font-mono"
                defaultValue={collector?.dpi}
                aria-invalid={invalid(state, 'dpi')}
              />
              <FieldError state={state} field="dpi" />
            </FormField>
            <FormField label={tc('birthDate')} htmlFor="birthDate">
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                className="h-10"
                defaultValue={collector?.birthDate ?? ''}
                aria-invalid={invalid(state, 'birthDate')}
              />
              <FieldError state={state} field="birthDate" />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('form.contact')}</CardTitle>
            <CardDescription>{t('form.contactDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <FormField label={tc('mobile')} htmlFor="mobile">
              <Input
                id="mobile"
                name="mobile"
                placeholder="0000 0000"
                className="h-10"
                defaultValue={collector?.mobile}
                aria-invalid={invalid(state, 'mobile')}
              />
              <FieldError state={state} field="mobile" />
            </FormField>
            <FormField label={tc('address')} htmlFor="address">
              <Textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={collector?.address}
                aria-invalid={invalid(state, 'address')}
              />
              <FieldError state={state} field="address" />
            </FormField>
          </CardContent>
        </Card>
      </form>
    </>
  )
}
