import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
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
import { formatNumber, formatQ, formatQCents } from '@/lib/format'
import { lastCollectionDate, listPayments } from '@/lib/queries/payments'
import { requireCollector } from '@/lib/session'

export default async function FieldTodayPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const { collectorId } = await requireCollector()

  const t = await getTranslations('field.today')
  const tc = await getTranslations('common')
  const tPayments = await getTranslations('payments')

  // The legacy `listIncomesOp.php` asked for a date and defaulted to none; the
  // screen shows the collector's latest working day, which on a normal day is
  // today and after a weekend is the last one they actually booked money.
  const date = await lastCollectionDate(collectorId)
  const rows = date ? await listPayments({ collectorId }, { date }) : []
  const total = rows
    .filter((row) => !row.voided)
    .reduce((sum, row) => sum + row.amount, 0)

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="mb-5 grid grid-cols-2 gap-4">
        <SummaryStat label={t('total')} value={formatQ(total, locale)} />
        <SummaryStat label={t('count')} value={formatNumber(rows.length, locale)} />
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{tPayments('table.credit')}</TableHead>
                    <TableHead>{tPayments('table.client')}</TableHead>
                    <TableHead className="text-right">{tPayments('table.amount')}</TableHead>
                    <TableHead className="text-right">{tPayments('table.balance')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead className="pr-4 text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className={row.voided ? 'opacity-60' : undefined}>
                      <TableCell className="pl-4">
                        <Link
                          href={`/credits/${row.creditId}`}
                          className="font-mono text-xs font-medium hover:underline"
                        >
                          {row.creditCode}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{row.customerName}</TableCell>
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
                          {tPayments('table.receipt')}
                        </LinkButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}
