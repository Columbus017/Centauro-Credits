'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

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

export function NewUserDialog({
  collectors,
}: {
  collectors: { value: string; label: string }[]
}) {
  const t = useTranslations('admin.users')
  const tc = useTranslations('common')
  const tRoles = useTranslations('roles')

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="lg">
            <Plus className="size-4" />
            {t('new')}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 sm:grid-cols-2">
          <FormField label={tc('firstName')} htmlFor="user-first-name">
            <Input id="user-first-name" className="h-10" />
          </FormField>
          <FormField label={tc('lastName')} htmlFor="user-last-name">
            <Input id="user-last-name" className="h-10" />
          </FormField>
          <FormField
            label={t('table.username')}
            htmlFor="user-username"
            className="sm:col-span-2"
          >
            <Input id="user-username" className="h-10 font-mono" autoComplete="off" />
          </FormField>
          <FormField label={t('dialog.password')} htmlFor="user-password">
            <Input
              id="user-password"
              type="password"
              className="h-10"
              autoComplete="new-password"
            />
          </FormField>
          <FormField label={t('dialog.confirm')} htmlFor="user-confirm">
            <Input
              id="user-confirm"
              type="password"
              className="h-10"
              autoComplete="new-password"
            />
          </FormField>
          <FormField label={t('dialog.role')}>
            <SelectField
              className="h-10 w-full"
              defaultValue="collector"
              options={[
                { value: 'admin', label: tRoles('admin') },
                { value: 'collector', label: tRoles('collector') },
              ]}
            />
          </FormField>
          <FormField label={t('dialog.linkedCollector')} hint={t('dialog.linkedHint')}>
            <SelectField
              className="h-10 w-full"
              options={collectors}
            />
          </FormField>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="lg" />}>
            {tc('cancel')}
          </DialogClose>
          <Button size="lg">{t('dialog.submit')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
