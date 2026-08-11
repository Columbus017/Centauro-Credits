'use client'

import { useActionState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, type LoginState } from '@/lib/actions/auth'

export function LoginForm() {
  const t = useTranslations('login')
  const locale = useLocale()
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  )

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {/* The action redirects on success and has no other way to know which
          locale the user is reading. */}
      <input type="hidden" name="locale" value={locale} />

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-px size-4 shrink-0" />
          <span>{t(`errors.${state.error}`)}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="username">{t('username')}</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('password')}</Label>
          <span className="text-xs text-muted-foreground">{t('forgot')}</span>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10"
        />
      </div>

      <Button type="submit" size="lg" className="h-10 w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  )
}
