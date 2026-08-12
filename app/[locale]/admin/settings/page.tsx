import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AdminTabs } from '@/components/admin-tabs'
import { CommerceCard } from '@/components/forms/commerce-card'
import { AppShell } from '@/components/app-shell'
import { FormField } from '@/components/form-field'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { PageHeader } from '@/components/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DEFAULT_INTEREST_RATE, GOOD_RECORD_DAYS } from '@/lib/ledger'
import { listCommerce } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function AdminSettingsPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('admin.settings')
  const commerce = await listCommerce()

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />
      <AdminTabs />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('business')}</CardTitle>
            <CardDescription>{t('businessDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {/* Read-only, and honestly so: the rate lives per credit
                (`credits.interest_rate`, so historical rows stay correct) and
                the grace window is a constant in `lib/ledger.ts`. Making these
                editable needs a settings table that does not exist. */}
            <FormField
              label={t('interestRate')}
              htmlFor="interest-rate"
              hint={t('readOnly')}
            >
              <Input
                id="interest-rate"
                className="h-10 font-mono"
                defaultValue={`${DEFAULT_INTEREST_RATE * 100}%`}
                readOnly
              />
            </FormField>
            <FormField
              label={t('goodRecordDays')}
              htmlFor="good-record-days"
              hint={t('goodRecordDaysHint')}
            >
              <Input
                id="good-record-days"
                className="h-10 font-mono"
                defaultValue={GOOD_RECORD_DAYS}
                readOnly
              />
            </FormField>
            <FormField label={t('currency')} htmlFor="currency" className="sm:col-span-2">
              <Input id="currency" className="h-10 font-mono" defaultValue="GTQ (Q)" readOnly />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('preferences')}</CardTitle>
            <CardDescription>{t('preferencesDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField label={t('language')} hint={t('languageHint')}>
              <LocaleSwitcher />
            </FormField>

          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <CommerceCard commerce={commerce} />
        </div>
      </div>
    </AppShell>
  )
}
