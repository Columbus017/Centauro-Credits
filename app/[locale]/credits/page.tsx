import { History, Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { SearchInput } from '@/components/search-input'
import { SelectField } from '@/components/select-field'
import { StatusBadge } from '@/components/status-badge'
import { SummaryStat } from '@/components/summary-stat'
import { LinkButton } from '@/components/link-button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { formatDate, formatNumber, formatQ } from '@/lib/format'
import {
  creditRows,
  daysSincePayment,
  GOOD_RECORD_DAYS,
  capitalTotal,
  outstandingTotal,
} from '@/lib/mock-data'
import { requireAdmin } from '@/lib/session'

export default async function CreditsPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('credits')
  const tc = await getTranslations('common')
  const tStatus = await getTranslations('status')

  const rows = creditRows()
  const active = rows.filter((row) => row.cancelledAt === null)
  const atRisk = active.filter((row) => daysSincePayment(row) > GOOD_RECORD_DAYS)

  return (
    <AppShell title={t('title')}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <LinkButton variant="outline" size="lg" href="/credits/import">
              <History className="size-4" />
              {t('import')}
            </LinkButton>
            <LinkButton size="lg" href="/credits/new">
              <Plus className="size-4" />
              {t('new')}
            </LinkButton>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label={t('summary.capital')} value={formatQ(capitalTotal, locale)} />
        <SummaryStat label={t('summary.outstanding')} value={formatQ(outstandingTotal, locale)} />
        <SummaryStat label={t('summary.active')} value={formatNumber(active.length, locale)} />
        <SummaryStat
          label={t('summary.atRisk')}
          value={formatNumber(atRisk.length, locale)}
          tone={atRisk.length > 0 ? 'danger' : 'default'}
        />
      </div>

      <Card className="py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput placeholder={t('searchPlaceholder')} />
          <SelectField
            size="default"
            className="h-9 min-w-40"
            options={[
              { value: 'all', label: t('allStatuses') },
              { value: 'active', label: tStatus('active') },
              { value: 'cancelled', label: tStatus('cancelled') },
              { value: 'badRecord', label: tStatus('badRecord') },
            ]}
          />
        </div>

        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t('table.code')}</TableHead>
                  <TableHead>{t('table.client')}</TableHead>
                  <TableHead>{t('table.collector')}</TableHead>
                  <TableHead>{t('table.startDate')}</TableHead>
                  <TableHead className="text-right">{t('table.principal')}</TableHead>
                  <TableHead className="text-right">{t('table.total')}</TableHead>
                  <TableHead className="text-right">{t('table.payments')}</TableHead>
                  <TableHead className="text-right">{t('table.outstanding')}</TableHead>
                  <TableHead className="pr-4">{tc('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <Link
                        href={`/credits/${row.id}`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {row.code}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/clients/${row.customerId}`} className="hover:underline">
                        {row.customerName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.collectorName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.startDate, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQ(row.principal, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatQ(row.totalDue, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {row.paymentCount}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQ(row.outstanding, locale)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
