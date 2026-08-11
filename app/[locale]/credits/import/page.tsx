import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CreditHistoryForm } from '@/components/credit-history-form'
import { PageHeader } from '@/components/page-header'
import { LinkButton } from '@/components/link-button'
import { collectors, customers, fullName, INTEREST_RATE } from '@/lib/mock-data'
import { requireAdmin } from '@/lib/session'

export default async function ImportCreditPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('credits')
  const tc = await getTranslations('common')

  const customerOptions = customers
    .filter((customer) => customer.active)
    .map((customer) => ({ id: customer.id, name: fullName(customer) }))
  const collectorOptions = collectors
    .filter((collector) => collector.active)
    .map((collector) => ({ id: collector.id, name: fullName(collector) }))

  return (
    <AppShell title={t('importPage.title')}>
      <PageHeader
        breadcrumbs={[{ label: t('title'), href: '/credits' }, { label: t('importPage.title') }]}
        title={t('importPage.title')}
        description={t('importPage.description')}
        actions={
          <LinkButton variant="outline" size="lg" href="/credits">
            {tc('cancel')}
          </LinkButton>
        }
      />

      <CreditHistoryForm
        customers={customerOptions}
        collectors={collectorOptions}
        interestRate={INTEREST_RATE}
        locale={locale}
      />
    </AppShell>
  )
}
