import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CreditAmountFields } from '@/components/credit-amount-fields'
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
import { formatPercent } from '@/lib/format'
import { DEFAULT_INTEREST_RATE } from '@/lib/ledger'
import { collectorOptions, customerOptions } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function NewCreditPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('credits')
  const tc = await getTranslations('common')

  const [customers, collectors] = await Promise.all([
    customerOptions(),
    collectorOptions(),
  ])
  const ratePercent = formatPercent(DEFAULT_INTEREST_RATE * 100, locale)

  return (
    <AppShell title={t('form.createTitle')}>
      <PageHeader
        breadcrumbs={[{ label: t('title'), href: '/credits' }, { label: t('form.createTitle') }]}
        title={t('form.createTitle')}
        description={t('form.createDescription')}
        actions={
          <>
            <LinkButton variant="outline" size="lg" href="/credits">
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
              <CreditAmountFields interestRate={DEFAULT_INTEREST_RATE} locale={locale} />
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
                <SelectField
                  className="h-10 w-full"
                  options={customers}
                />
              </FormField>
              <FormField label={tc('collector')}>
                <SelectField
                  className="h-10 w-full"
                  options={collectors}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </form>
    </AppShell>
  )
}
