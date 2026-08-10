import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'

// Placeholder home route. Phase 1 replaces this with the real dashboard
// (KPI tiles + the portfolio / collections / delinquency tabs).
export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('nav')
  const tApp = await getTranslations('app')

  return (
    <AppShell title={t('dashboard')}>
      <PageHeader title={t('dashboard')} description={tApp('description')} />
    </AppShell>
  )
}
