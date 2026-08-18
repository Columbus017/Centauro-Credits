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
import { createRoute, updateRoute } from '@/lib/actions/entities'
import { EMPTY_STATE, type FormState } from '@/lib/actions/form-state'

export type RouteDraft = {
  id: number
  code: string
  name: string
  details: string
  collectorId: number | null
}

export function RouteForm({
  route,
  collectors,
}: {
  route?: RouteDraft
  collectors: SelectOption[]
}) {
  const t = useTranslations('routes')
  const tc = useTranslations('common')
  const locale = useLocale()

  const editing = route !== undefined
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    editing ? updateRoute : createRoute,
    EMPTY_STATE,
  )

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('title'), href: '/routes' },
          { label: editing ? tc('edit') : t('form.createTitle') },
        ]}
        title={editing ? `${tc('edit')} — ${route.name}` : t('form.createTitle')}
        description={editing ? undefined : t('form.createDescription')}
        actions={
          <>
            <LinkButton
              variant="outline"
              size="lg"
              href={editing ? `/routes/${route.id}` : '/routes'}
            >
              {tc('cancel')}
            </LinkButton>
            <Button size="lg" type="submit" form="route-form" disabled={pending}>
              {pending ? tc('saving') : t('form.save')}
            </Button>
          </>
        }
      />

      <FormError state={state} />

      <form id="route-form" action={formAction} className="max-w-2xl">
        <input type="hidden" name="locale" value={locale} />
        {editing && <input type="hidden" name="id" value={route.id} />}

        <Card>
          <CardHeader>
            <CardTitle>{t('form.details')}</CardTitle>
            <CardDescription>{t('form.detailsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField label={t('form.code')} htmlFor="code">
              <Input
                id="code"
                name="code"
                placeholder="R-00"
                className="h-10 font-mono"
                defaultValue={route?.code}
                aria-invalid={invalid(state, 'code')}
              />
              <FieldError state={state} field="code" />
            </FormField>
            <FormField label={t('form.name')} htmlFor="name">
              <Input
                id="name"
                name="name"
                placeholder="Zona 1 Centro"
                className="h-10"
                defaultValue={route?.name}
                aria-invalid={invalid(state, 'name')}
              />
              <FieldError state={state} field="name" />
            </FormField>
            <FormField label={tc('collector')} className="sm:col-span-2">
              <SelectField
                name="collectorId"
                className="h-10 w-full"
                options={collectors}
                defaultValue={
                  route?.collectorId != null ? String(route.collectorId) : undefined
                }
              />
              <FieldError state={state} field="collectorId" />
            </FormField>
            <FormField label={t('form.notes')} htmlFor="details" className="sm:col-span-2">
              <Textarea
                id="details"
                name="details"
                rows={3}
                defaultValue={route?.details}
              />
            </FormField>
          </CardContent>
        </Card>
      </form>
    </>
  )
}
