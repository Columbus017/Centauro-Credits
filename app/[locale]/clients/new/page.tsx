import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CustomerForm } from '@/components/forms/customer-form'
import { commerceOptions, routeOptions } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function NewClientPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('clients')
  const [routes, businesses] = await Promise.all([routeOptions(), commerceOptions()])

  return (
    <AppShell title={t('form.createTitle')}>
      <CustomerForm routes={routes} businesses={businesses} />
    </AppShell>
  )
}
