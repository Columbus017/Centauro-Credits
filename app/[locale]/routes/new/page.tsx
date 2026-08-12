import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { RouteForm } from '@/components/forms/route-form'
import { collectorOptions } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function NewRoutePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('routes')
  const collectors = await collectorOptions()

  return (
    <AppShell title={t('form.createTitle')}>
      <RouteForm collectors={collectors} />
    </AppShell>
  )
}
