import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { DailyCloseForm } from '@/components/daily-close-form'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { formatDate, formatQ } from '@/lib/format'
import { closeCash, collectorById, collectors, dailyCloses, fullName } from '@/lib/mock-data'
import { requireAdmin } from '@/lib/session'

export default async function DailyClosePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('dailyClose')

  const collectorOptions = collectors
    .filter((collector) => collector.active)
    .map((collector) => ({ id: collector.id, name: fullName(collector) }))

  const history = [...dailyCloses].sort(
    (a, b) => b.closeDate.localeCompare(a.closeDate) || a.collectorId - b.collectorId,
  )

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />

      <DailyCloseForm collectors={collectorOptions} locale={locale} />

      <Card className="mt-6 py-0">
        <CardHeader className="pt-6">
          <CardTitle>{t('history')}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">{t('table.date')}</TableHead>
                  <TableHead>{t('table.collector')}</TableHead>
                  <TableHead className="text-right">{t('table.base')}</TableHead>
                  <TableHead className="text-right">{t('table.collected')}</TableHead>
                  <TableHead className="text-right">{t('table.disbursed')}</TableHead>
                  <TableHead className="text-right">{t('table.surplus')}</TableHead>
                  <TableHead className="pr-6 text-right">{t('table.cash')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((close) => {
                  const collector = collectorById(close.collectorId)
                  return (
                    <TableRow key={close.id}>
                      <TableCell className="pl-6">
                        {formatDate(close.closeDate, locale)}
                      </TableCell>
                      <TableCell>
                        {collector ? (
                          <Link
                            href={`/collectors/${collector.id}`}
                            className="font-medium hover:underline"
                          >
                            {fullName(collector)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatQ(close.base, locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatQ(close.collected, locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatQ(close.disbursed, locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatQ(close.surplus, locale)}
                      </TableCell>
                      <TableCell className="pr-6 text-right font-mono font-semibold tabular-nums">
                        {formatQ(closeCash(close), locale)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
