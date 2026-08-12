'use client'

import { useActionState, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { ActionButton } from '@/components/forms/action-button'
import { FieldError, FormError, invalid } from '@/components/forms/form-errors'
import { FormField } from '@/components/form-field'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createCommerce, setCommerceActive } from '@/lib/actions/entities'
import { EMPTY_STATE, type FormState } from '@/lib/actions/form-state'

export type CommerceRow = {
  id: number
  name: string
  active: boolean
  customerCount: number
}

/**
 * The marketplaces clients trade in — `BLL/commerce.php`, which could only
 * ever create one. The legacy table has no `state` column, so a name typed by
 * mistake stayed in every dropdown for good; `commerce.active` retires it
 * without touching the clients that reference it.
 */
export function CommerceCard({ commerce }: { commerce: CommerceRow[] }) {
  const t = useTranslations('admin.settings')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [name, setName] = useState('')
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createCommerce,
    EMPTY_STATE,
  )

  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.ok) setName('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('commerce')}</CardTitle>
        <CardDescription>{t('commerceDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <FormError state={state} />

        <form action={formAction} className="flex items-end gap-2">
          <input type="hidden" name="locale" value={locale} />
          <FormField label={t('commerceName')} htmlFor="commerce-name" className="flex-1">
            <Input
              id="commerce-name"
              name="name"
              className="h-10"
              placeholder="Mercado Central"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={invalid(state, 'name')}
            />
            <FieldError state={state} field="name" />
          </FormField>
          <Button type="submit" size="lg" disabled={pending || name.trim() === ''}>
            <Plus className="size-4" />
            {tc('add')}
          </Button>
        </form>

        <ul className="divide-y divide-border border-t border-border">
          {commerce.map((business) => (
            <li key={business.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{business.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {t('commerceClients', { count: business.customerCount })}
                </span>
              </span>
              <StatusBadge status={business.active ? 'active' : 'inactive'} />
              <ActionButton
                action={setCommerceActive}
                fields={{ id: business.id, active: String(!business.active) }}
              >
                {business.active ? tc('deactivate') : tc('activate')}
              </ActionButton>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
