'use client'

import { useActionState, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { FieldError, FormError, invalid } from '@/components/forms/form-errors'
import { FormField } from '@/components/form-field'
import { SelectField } from '@/components/select-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createUser } from '@/lib/actions/users'
import { EMPTY_STATE, type FormState } from '@/lib/actions/form-state'

export function NewUserDialog({
  collectors,
}: {
  collectors: { value: string; label: string }[]
}) {
  const t = useTranslations('admin.users')
  const tc = useTranslations('common')
  const tRoles = useTranslations('roles')
  const locale = useLocale()

  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('collector')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createUser,
    EMPTY_STATE,
  )

  // Adjusted during render rather than in an effect, so the dialog is never
  // painted open after the user has already been created.
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.ok) {
      setOpen(false)
      setPassword('')
      setConfirm('')
    }
  }

  // The confirmation never reaches the server: it exists to catch a typo, and
  // the server has nothing to compare it against.
  const mismatch = confirm !== '' && password !== confirm

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="lg">
            <Plus className="size-4" />
            {t('new')}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <form action={formAction}>
          <input type="hidden" name="locale" value={locale} />

          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
            <DialogDescription>{t('dialog.description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormError state={state} />
            </div>
          <FormField label={tc('firstName')} htmlFor="user-first-name">
            <Input
              id="user-first-name"
              name="firstName"
              className="h-10"
              aria-invalid={invalid(state, 'firstName')}
            />
            <FieldError state={state} field="firstName" />
          </FormField>
          <FormField label={tc('lastName')} htmlFor="user-last-name">
            <Input
              id="user-last-name"
              name="lastName"
              className="h-10"
              aria-invalid={invalid(state, 'lastName')}
            />
            <FieldError state={state} field="lastName" />
          </FormField>
          <FormField
            label={t('table.username')}
            htmlFor="user-username"
            className="sm:col-span-2"
          >
            <Input
              id="user-username"
              name="username"
              className="h-10 font-mono"
              autoComplete="off"
              aria-invalid={invalid(state, 'username')}
            />
            <FieldError state={state} field="username" />
          </FormField>
          <FormField label={t('dialog.password')} htmlFor="user-password">
            <Input
              id="user-password"
              name="password"
              type="password"
              className="h-10"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={invalid(state, 'password')}
            />
            <FieldError state={state} field="password" />
          </FormField>
          <FormField label={t('dialog.confirm')} htmlFor="user-confirm">
            <Input
              id="user-confirm"
              type="password"
              className="h-10"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              aria-invalid={mismatch || undefined}
            />
            {mismatch && (
              <p className="text-xs text-destructive">{t('dialog.mismatch')}</p>
            )}
          </FormField>
          <FormField label={t('dialog.role')}>
            <SelectField
              name="role"
              className="h-10 w-full"
              defaultValue="collector"
              onValueChange={setRole}
              options={[
                { value: 'admin', label: tRoles('admin') },
                { value: 'collector', label: tRoles('collector') },
              ]}
            />
          </FormField>
          {/* An admin has no round, so the link is only offered to collectors. */}
          {role === 'collector' && (
            <FormField label={t('dialog.linkedCollector')} hint={t('dialog.linkedHint')}>
              <SelectField name="collectorId" className="h-10 w-full" options={collectors} />
            </FormField>
          )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="lg" type="button" />}>
              {tc('cancel')}
            </DialogClose>
            <Button size="lg" type="submit" disabled={mismatch || pending}>
              {pending ? tc('saving') : t('dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
