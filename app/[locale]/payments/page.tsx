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
import { formatDate, formatNumber, formatQ, formatQCents } from '@/lib/format'
import { collectors, fullName, paymentRows } from '@/lib/mock-data'

export default async function PaymentsPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('payments')
  const tc = await getTranslations('common')

  const rows = paymentRows()
  const posted = rows.filter((row) => !row.voided)
  const voided = rows.length - posted.length

  const total = posted.reduce((sum, row) => sum + row.amount, 0)
  const average = posted.length > 0 ? total / posted.length : 0

  // The most recent day on the book stands in for "today" while data is mocked.
  const latestDate = posted[0]?.date ?? ''
  const today = posted
    .filter((row) => row.date === latestDate)
    .reduce((sum, row) => sum + row.amount, 0)

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label={t('summary.today')} value={formatQ(today, locale)} />
        <SummaryStat label={t('summary.count')} value={formatNumber(posted.length, locale)} />
        <SummaryStat label={t('summary.average')} value={formatQ(average, locale)} />
        <SummaryStat
          label={t('summary.voided')}
          value={formatNumber(voided, locale)}
          tone={voided > 0 ? 'danger' : 'default'}
        />
      </div>

      <Card className="py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput placeholder={t('searchPlaceholder')} />
          <SelectField
            size="default"
            className="h-9 min-w-44"
            options={[
              { value: 'all', label: t('allCollectors') },
              ...collectors.map((collector) => ({
                value: String(collector.id),
                label: fullName(collector),
              })),
            ]}
          />
        </div>

        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t('table.date')}</TableHead>
                  <TableHead>{t('table.credit')}</TableHead>
                  <TableHead>{t('table.client')}</TableHead>
                  <TableHead>{t('table.collector')}</TableHead>
                  <TableHead>{t('table.route')}</TableHead>
                  <TableHead className="text-right">{t('table.amount')}</TableHead>
                  <TableHead className="text-right">{t('table.balance')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="pr-4 text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className={row.voided ? 'opacity-60' : undefined}>
                    <TableCell className="pl-4">{formatDate(row.date, locale)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/credits/${row.creditId}`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {row.creditCode}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{row.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.collectorName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.routeName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQCents(row.amount, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatQCents(row.runningBalance, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.voided ? 'voided' : 'posted'} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <LinkButton
                        variant="ghost"
                        size="sm"
                        href={`/payments/${row.id}/receipt`}
                        >
                        {t('table.receipt')}
                      </LinkButton>
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
