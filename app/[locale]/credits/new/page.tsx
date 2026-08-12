import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CreditForm } from '@/components/forms/credit-form'
import { today } from '@/lib/clock'
import { DEFAULT_INTEREST_RATE } from '@/lib/ledger'
import { collectorOptions, customerOptions } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function NewCreditPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('credits')
  const [customers, collectors] = await Promise.all([
    customerOptions(),
    collectorOptions(),
  ])

  return (
    <AppShell title={t('form.createTitle')}>
      <CreditForm
        customers={customers}
        collectors={collectors}
        interestRate={DEFAULT_INTEREST_RATE}
        today={today()}
        locale={locale}
      />
    </AppShell>
  )
}
