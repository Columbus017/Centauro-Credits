import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { RouteForm } from '@/components/forms/route-form'
import { collectorOptions, getRoute } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function EditRoutePage({
  params,
}: PageProps<'/[locale]/routes/[id]/edit'>) {
  const { locale, id } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const [route, collectors] = await Promise.all([
    getRoute(Number(id)),
    collectorOptions(),
  ])
  if (!route) notFound()

  const tc = await getTranslations('common')

  return (
    <AppShell title={`${tc('edit')} — ${route.name}`}>
      <RouteForm route={route} collectors={collectors} />
    </AppShell>
  )
}
