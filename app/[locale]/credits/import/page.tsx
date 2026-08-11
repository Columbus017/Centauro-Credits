import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { CreditHistoryForm } from '@/components/credit-history-form'
import { PageHeader } from '@/components/page-header'
import { LinkButton } from '@/components/link-button'
import { DEFAULT_INTEREST_RATE } from '@/lib/ledger'
import { collectorOptions, customerOptions } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function ImportCreditPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('credits')
  const tc = await getTranslations('common')

  const [customers, collectors] = await Promise.all([
    customerOptions(),
    collectorOptions(),
  ])

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
        customers={customers}
        collectors={collectors}
        interestRate={DEFAULT_INTEREST_RATE}
        locale={locale}
      />
    </AppShell>
  )
}
