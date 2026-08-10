import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AdminTabs } from '@/components/admin-tabs'
import { AppShell } from '@/components/app-shell'
import { FormField } from '@/components/form-field'
import { LocaleSwitcher } from '@/components/locale-switcher'
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
import { Switch } from '@/components/ui/switch'
import { GOOD_RECORD_DAYS, INTEREST_RATE } from '@/lib/mock-data'

export default async function AdminSettingsPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('admin.settings')
  const tc = await getTranslations('common')

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
            <FormField
              label={t('interestRate')}
              htmlFor="interest-rate"
              hint={t('interestRateHint')}
            >
              <Input
                id="interest-rate"
                className="h-10 font-mono"
                defaultValue={`${INTEREST_RATE * 100}%`}
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
              />
            </FormField>
            <FormField label={t('currency')} htmlFor="currency" className="sm:col-span-2">
              <Input id="currency" className="h-10 font-mono" defaultValue="GTQ (Q)" readOnly />
            </FormField>
            <div className="sm:col-span-2">
              <Button size="lg">{tc('save')}</Button>
            </div>
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

            <div className="flex items-start justify-between gap-4 border-t border-border pt-5">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('notifications')}</p>
                <p className="text-xs text-muted-foreground">{t('notificationsHint')}</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
