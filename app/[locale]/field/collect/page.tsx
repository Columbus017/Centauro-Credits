import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { RecordPaymentDialog } from '@/components/record-payment-dialog'
import { SearchInput } from '@/components/search-input'
import { SummaryStat } from '@/components/summary-stat'
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
import { creditRows, creditsForCollector, daysSincePayment } from '@/lib/mock-data'
import { requireCollector } from '@/lib/session'

export default async function FieldCollectPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const { collectorId } = await requireCollector()

  const t = await getTranslations('field.collect')
  const tc = await getTranslations('common')
  const tCredits = await getTranslations('credits')

  const own = creditsForCollector(collectorId).filter(
    (credit) => credit.cancelledAt === null,
  )
  const rows = creditRows(own).sort((a, b) => daysSincePayment(b) - daysSincePayment(a))
  const portfolio = rows.reduce((sum, row) => sum + row.outstanding, 0)

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="mb-5 grid grid-cols-2 gap-4">
        <SummaryStat
          label={tCredits('summary.active')}
          value={formatNumber(rows.length, locale)}
        />
        <SummaryStat
          label={tCredits('summary.outstanding')}
          value={formatQ(portfolio, locale)}
        />
      </div>

      <Card className="py-0">
        <div className="border-b border-border p-4">
          <SearchInput placeholder={t('searchPlaceholder')} />
        </div>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{tCredits('table.code')}</TableHead>
                    <TableHead>{tCredits('table.client')}</TableHead>
                    <TableHead>{tCredits('table.lastPayment')}</TableHead>
                    <TableHead className="text-right">
                      {tCredits('table.outstanding')}
                    </TableHead>
                    <TableHead className="pr-4 text-right">{tc('actions')}</TableHead>
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
                      <TableCell className="font-medium">{row.customerName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.lastPaymentDate ? formatDate(row.lastPaymentDate, locale) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatQ(row.outstanding, locale)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <RecordPaymentDialog
                          creditCode={row.code}
                          customerName={row.customerName}
                          outstanding={row.outstanding}
                          locale={locale}
                        />
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
