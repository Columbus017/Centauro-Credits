import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CollectorForm } from '@/components/forms/collector-form'
import { getCollector } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function EditCollectorPage({
  params,
}: PageProps<'/[locale]/collectors/[id]/edit'>) {
  const { locale, id } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const collector = await getCollector(Number(id))
  if (!collector) notFound()

  const tc = await getTranslations('common')

  return (
    <AppShell title={`${tc('edit')} — ${collector.name}`}>
      <CollectorForm collector={collector} />
    </AppShell>
  )
}
