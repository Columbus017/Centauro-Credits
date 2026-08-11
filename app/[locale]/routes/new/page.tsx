import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { FormField } from '@/components/form-field'
import { SelectField } from '@/components/select-field'
import { PageHeader } from '@/components/page-header'
import { LinkButton } from '@/components/link-button'
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
import { collectors, fullName } from '@/lib/mock-data'
import { requireAdmin } from '@/lib/session'

export default async function NewRoutePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('routes')
  const tc = await getTranslations('common')

  const activeCollectors = collectors.filter((collector) => collector.active)

  return (
    <AppShell title={t('form.createTitle')}>
      <PageHeader
        breadcrumbs={[{ label: t('title'), href: '/routes' }, { label: t('form.createTitle') }]}
        title={t('form.createTitle')}
        description={t('form.createDescription')}
        actions={
          <>
            <LinkButton variant="outline" size="lg" href="/routes">
              {tc('cancel')}
            </LinkButton>
            <Button size="lg">{t('form.save')}</Button>
          </>
        }
      />

      <form className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('form.details')}</CardTitle>
            <CardDescription>{t('form.detailsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField label={t('form.code')} htmlFor="code">
              <Input id="code" placeholder="R-00" className="h-10 font-mono" />
            </FormField>
            <FormField label={t('form.name')} htmlFor="name">
              <Input id="name" placeholder="Zona 1 Centro" className="h-10" />
            </FormField>
            <FormField label={tc('collector')} className="sm:col-span-2">
              <SelectField
                className="h-10 w-full"
                options={activeCollectors.map((collector) => ({
                  value: String(collector.id),
                  label: fullName(collector),
                }))}
              />
            </FormField>
            <FormField label={t('form.notes')} htmlFor="details" className="sm:col-span-2">
              <Textarea id="details" rows={3} />
            </FormField>
          </CardContent>
        </Card>
      </form>
    </AppShell>
  )
}
