'use server'

import { AuthError } from 'next-auth'
import { z } from 'zod'

import { signIn, signOut } from '@/lib/auth'
import { getPathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

/** A key under the `login.errors` message namespace, or nothing. */
export type LoginState = { error?: 'required' | 'invalid' }

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
})

function localeOf(value: FormDataEntryValue | null): Locale {
  const locale = String(value)
  return routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale
}

/**
 * Signs in and lands the user on `/`, which `proxy.ts` turns into the right
 * screen for their role. The role is not known here — `signIn` reports success
 * by throwing a redirect, not by returning a session — and asking the database
 * for it a second time only to pick a URL is a query for nothing.
 */
export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'required' }

  const locale = localeOf(formData.get('locale'))

  try {
    await signIn('credentials', {
      ...parsed.data,
      redirectTo: getPathname({ href: '/', locale }),
    })
  } catch (error) {
    // A successful sign-in also throws — a Next redirect, which must travel on.
    if (error instanceof AuthError) return { error: 'invalid' }
    throw error
  }

  // Unreachable: `signIn` either redirected or threw.
  return {}
}

export async function logout(formData: FormData) {
  const locale = localeOf(formData.get('locale'))
  await signOut({ redirectTo: getPathname({ href: '/login', locale }) })
}
