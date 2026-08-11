import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { FormField } from '@/components/form-field'
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
import { requireAdmin } from '@/lib/session'

export default async function NewCollectorPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('collectors')
  const tc = await getTranslations('common')

  return (
    <AppShell title={t('form.createTitle')}>
      <PageHeader
        breadcrumbs={[
          { label: t('title'), href: '/collectors' },
          { label: t('form.createTitle') },
        ]}
        title={t('form.createTitle')}
        description={t('form.createDescription')}
        actions={
          <>
            <LinkButton variant="outline" size="lg" href="/collectors">
              {tc('cancel')}
            </LinkButton>
            <Button size="lg">{t('form.save')}</Button>
          </>
        }
      />

      <form className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('form.personal')}</CardTitle>
            <CardDescription>{t('form.personalDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField label={tc('firstName')} htmlFor="first-name">
              <Input id="first-name" placeholder="Carlos" className="h-10" />
            </FormField>
            <FormField label={tc('lastName')} htmlFor="last-name">
              <Input id="last-name" placeholder="Mejía" className="h-10" />
            </FormField>
            <FormField label={tc('dpi')} htmlFor="dpi">
              <Input id="dpi" placeholder="0000 00000 0000" className="h-10 font-mono" />
            </FormField>
            <FormField label={tc('birthDate')} htmlFor="birth-date">
              <Input id="birth-date" type="date" className="h-10" />
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
              <Input id="mobile" placeholder="0000 0000" className="h-10" />
            </FormField>
            <FormField label={tc('address')} htmlFor="address">
              <Textarea id="address" rows={3} />
            </FormField>
          </CardContent>
        </Card>
      </form>
    </AppShell>
  )
}
