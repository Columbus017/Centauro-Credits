import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CreditAmountFields } from '@/components/credit-amount-fields'
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
import { Link } from '@/i18n/navigation'
import { formatPercent } from '@/lib/format'
import { collectors, customers, fullName, INTEREST_RATE } from '@/lib/mock-data'

export default async function NewCreditPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('credits')
  const tc = await getTranslations('common')

  const activeCustomers = customers.filter((customer) => customer.active)
  const activeCollectors = collectors.filter((collector) => collector.active)
  const ratePercent = formatPercent(INTEREST_RATE * 100, locale)

  return (
    <AppShell title={t('form.createTitle')}>
      <PageHeader
        breadcrumbs={[{ label: t('title'), href: '/credits' }, { label: t('form.createTitle') }]}
        title={t('form.createTitle')}
        description={t('form.createDescription')}
        actions={
          <>
            <Button variant="outline" size="lg" render={<Link href="/credits" />}>
              {tc('cancel')}
            </Button>
            <Button size="lg">{t('form.save')}</Button>
          </>
        }
      />

      <form className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('form.details')}</CardTitle>
              <CardDescription>
                {t('form.detailsDescription', { rate: ratePercent })}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <FormField label={t('form.code')} htmlFor="code">
                <Input id="code" placeholder="T-0000" className="h-10 font-mono" />
              </FormField>
              <FormField label={t('form.startDate')} htmlFor="start-date">
                <Input id="start-date" type="date" className="h-10" />
              </FormField>
              <CreditAmountFields interestRate={INTEREST_RATE} locale={locale} />
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
              <FormField label={tc('client')}>
                <Select defaultValue={String(activeCustomers[0]?.id ?? '')}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {fullName(customer)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={tc('collector')}>
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
            </CardContent>
          </Card>
        </div>
      </form>
    </AppShell>
  )
}
