import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CustomerForm } from '@/components/forms/customer-form'
import { commerceOptions, getCustomer, routeOptions } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function EditClientPage({
  params,
}: PageProps<'/[locale]/clients/[id]/edit'>) {
  const { locale, id } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const [customer, routes, businesses] = await Promise.all([
    getCustomer(Number(id)),
    routeOptions(),
    commerceOptions(),
  ])
  if (!customer) notFound()

  const tc = await getTranslations('common')

  return (
    <AppShell title={`${tc('edit')} — ${customer.name}`}>
      <CustomerForm customer={customer} routes={routes} businesses={businesses} />
    </AppShell>
  )
}
