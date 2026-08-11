import 'server-only'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { routing, type Locale } from '@/i18n/routing'
import type { FormState } from '@/lib/actions/form-state'

// Errors travel as message *keys*, not sentences: an action runs on the server
// with no request locale of its own, and the form that renders the result
// already has `next-intl` loaded. See `lib/actions/form-state.ts`.
export type { FormState } from '@/lib/actions/form-state'

// --------------------------------------------------------------- validation

/** Required text, trimmed. */
export const requiredText = (max: number) =>
  z.string().trim().min(1, 'required').max(max, 'tooLong')

/** Optional text: a blank field is `null`, not an empty string. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'tooLong')
    .transform((value) => (value === '' ? null : value))

/** `YYYY-MM-DD` from a native date input. */
export const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalidDate')

export const optionalIsoDate = z
  .union([isoDateString, z.literal('')])
  .transform((value) => (value === '' ? null : value))

/**
 * A quetzal amount from a text input.
 *
 * Rejects more than two decimals rather than rounding: the operator typed
 * something they did not mean, and silently keeping half of it is how a
 * ledger stops reconciling.
 */
export const money = z
  .string()
  .trim()
  .min(1, 'required')
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), 'invalidAmount')
  .transform(Number)
  .refine((value) => value > 0, 'mustBePositive')

/** A foreign key from a `<select>`. */
export const foreignKey = z
  .string()
  .trim()
  .min(1, 'required')
  .refine((value) => /^\d+$/.test(value), 'required')
  .transform(Number)

export const optionalForeignKey = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .refine((value) => value === null || /^\d+$/.test(value), 'required')
  .transform((value) => (value === null ? null : Number(value)))

/**
 * Runs a schema over a `FormData`, turning failures into field keys.
 *
 * Zod's own messages are English prose; the `message` on each issue here is
 * the key the form will translate.
 */
export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { ok: true; data: z.output<T> } | { ok: false; state: FormState } {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (parsed.success) return { ok: true, data: parsed.data }

  const fieldErrors: Record<string, string> = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && !fieldErrors[field]) {
      fieldErrors[field] = issue.message || 'invalid'
    }
  }

  return { ok: false, state: { error: 'checkFields', fieldErrors } }
}

// ----------------------------------------------------------------- plumbing

export function localeFrom(formData: FormData): Locale {
  const value = String(formData.get('locale'))
  return routing.locales.includes(value as Locale)
    ? (value as Locale)
    : routing.defaultLocale
}

/**
 * Invalidates the pages a write touches.
 *
 * Paths carry the `[locale]` segment because that is where every screen lives;
 * `type: 'page'` is required for a path with a dynamic segment and covers both
 * locales at once.
 */
export function revalidate(...paths: string[]) {
  for (const path of paths) {
    revalidatePath(`/[locale]${path === '/' ? '' : path}`, 'page')
  }
}

/**
 * Everything a change to the book can move.
 *
 * Money touched anywhere shows up on the dashboard, the client, the collector
 * and the route, so a payment invalidates all of them rather than trying to be
 * clever about which. These are cheap server renders, not cached fetches.
 */
export function revalidateLedger() {
  revalidate(
    '/',
    '/credits',
    '/credits/[id]',
    '/clients',
    '/clients/[id]',
    '/collectors',
    '/collectors/[id]',
    '/routes',
    '/routes/[id]',
    '/payments',
    '/daily-close',
    '/field/collect',
    '/field/today',
  )
}
