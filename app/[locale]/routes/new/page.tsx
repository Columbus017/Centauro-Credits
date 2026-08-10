import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { FormField } from '@/components/form-field'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Link } from '@/i18n/navigation'
import { collectors, fullName } from '@/lib/mock-data'

export default async function NewRoutePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

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
            <Button variant="outline" size="lg" render={<Link href="/routes" />}>
              {tc('cancel')}
            </Button>
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
              <Select defaultValue={String(activeCollectors[0]?.id ?? '')}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeCollectors.map((collector) => (
                    <SelectItem key={collector.id} value={String(collector.id)}>
                      {fullName(collector)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
