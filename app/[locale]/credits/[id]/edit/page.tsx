import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CreditForm } from '@/components/forms/credit-form'
import { today } from '@/lib/clock'
import { getCredit } from '@/lib/queries/credits'
import { collectorOptions, customerOptions } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function EditCreditPage({
  params,
}: PageProps<'/[locale]/credits/[id]/edit'>) {
  const { locale, id } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const [credit, customers, collectors] = await Promise.all([
    getCredit(Number(id), { collectorId: null }),
    customerOptions(),
    collectorOptions(),
  ])
  if (!credit) notFound()

  const tc = await getTranslations('common')

  return (
    <AppShell title={`${tc('edit')} — ${credit.code}`}>
      <CreditForm
        credit={credit}
        customers={customers}
        collectors={collectors}
        interestRate={credit.interestRate}
        today={today()}
        locale={locale}
      />
    </AppShell>
  )
}
