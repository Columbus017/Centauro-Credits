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
import { commerce, routes } from '@/lib/mock-data'
import { requireAdmin } from '@/lib/session'

export default async function NewClientPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('clients')
  const tc = await getTranslations('common')

  const activeRoutes = routes.filter((route) => route.active)

  return (
    <AppShell title={t('form.createTitle')}>
      <PageHeader
        breadcrumbs={[{ label: t('title'), href: '/clients' }, { label: t('form.createTitle') }]}
        title={t('form.createTitle')}
        description={t('form.createDescription')}
        actions={
          <>
            <LinkButton variant="outline" size="lg" href="/clients">
              {tc('cancel')}
            </LinkButton>
            <Button size="lg">{t('form.save')}</Button>
          </>
        }
      />

      <form className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('form.personal')}</CardTitle>
              <CardDescription>{t('form.personalDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <FormField label={tc('firstName')} htmlFor="first-name">
                <Input id="first-name" placeholder="Rosa" className="h-10" />
              </FormField>
              <FormField label={tc('lastName')} htmlFor="last-name">
                <Input id="last-name" placeholder="Martínez" className="h-10" />
              </FormField>
              <FormField
                label={tc('dpi')}
                htmlFor="dpi"
                hint={t('form.dpiHint')}
                className="sm:col-span-2"
              >
                <Input id="dpi" placeholder="0000 00000 0000" className="h-10 font-mono" />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('form.contact')}</CardTitle>
              <CardDescription>{t('form.contactDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <FormField label={tc('mobile')} htmlFor="mobile">
                <Input id="mobile" placeholder="0000 0000" className="h-10" />
              </FormField>
              <FormField label={tc('mobile2')} htmlFor="mobile2">
                <Input id="mobile2" placeholder="0000 0000" className="h-10" />
              </FormField>
              <FormField label={tc('address')} htmlFor="address" className="sm:col-span-2">
                <Textarea id="address" rows={3} />
              </FormField>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('form.assignment')}</CardTitle>
              <CardDescription>{t('form.assignmentDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField label={tc('route')}>
                <SelectField
                  className="h-10 w-full"
                  options={activeRoutes.map((route) => ({
                    value: String(route.id),
                    label: `${route.code} · ${route.name}`,
                  }))}
                />
              </FormField>
              <FormField label={tc('commerce')}>
                <SelectField
                  className="h-10 w-full"
                  options={commerce.map((business) => ({
                    value: String(business.id),
                    label: business.name,
                  }))}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </form>
    </AppShell>
  )
}
