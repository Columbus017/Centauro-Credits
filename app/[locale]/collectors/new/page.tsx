import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CollectorForm } from '@/components/forms/collector-form'
import { requireAdmin } from '@/lib/session'

export default async function NewCollectorPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('collectors')

  return (
    <AppShell title={t('form.createTitle')}>
      <CollectorForm />
    </AppShell>
  )
}
