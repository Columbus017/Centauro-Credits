'use client'

import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { FormState } from '@/lib/actions/form-state'

/**
 * The banner a failed submit puts at the top of a form.
 *
 * Actions return message *keys* rather than sentences — they run on the server
 * with no request locale — so translation happens here.
 */
export function FormError({ state }: { state: FormState }) {
  const t = useTranslations('errors')
  if (!state.error) return null

  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-px size-4 shrink-0" />
      <span>{t(state.error)}</span>
    </div>
  )
}

/** The message under a single field. */
export function FieldError({ state, field }: { state: FormState; field: string }) {
  const t = useTranslations('errors')
  const key = state.fieldErrors?.[field]
  if (!key) return null

  return <p className="text-xs text-destructive">{t(key)}</p>
}

/** `aria-invalid` for the control itself, so the ring turns red. */
export function invalid(state: FormState, field: string) {
  return state.fieldErrors?.[field] ? true : undefined
}
