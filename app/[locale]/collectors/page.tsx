import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { SearchInput } from '@/components/search-input'
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
import { formatNumber, formatQ } from '@/lib/format'
import { listCollectors } from '@/lib/queries/entities'
import { requireAdmin } from '@/lib/session'

export default async function CollectorsPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const t = await getTranslations('collectors')
  const tc = await getTranslations('common')

  const rows = await listCollectors()

  const totalPortfolio = rows.reduce((sum, row) => sum + row.portfolio, 0)
  const totalCollected = rows.reduce((sum, row) => sum + row.collected, 0)
  const activeCount = rows.filter((row) => row.active).length

  return (
    <AppShell title={t('title')}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <LinkButton size="lg" href="/collectors/new">
            <Plus className="size-4" />
            {t('new')}
          </LinkButton>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label={t('summary.total')} value={formatNumber(rows.length, locale)} />
        <SummaryStat label={t('summary.active')} value={formatNumber(activeCount, locale)} />
        <SummaryStat label={t('summary.portfolio')} value={formatQ(totalPortfolio, locale)} />
        <SummaryStat label={t('summary.collected')} value={formatQ(totalCollected, locale)} />
      </div>

      <Card className="py-0">
        <div className="border-b border-border p-4">
          <SearchInput placeholder={t('searchPlaceholder')} />
        </div>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t('table.collector')}</TableHead>
                  <TableHead>{t('table.routes')}</TableHead>
                  <TableHead className="text-right">{t('table.clients')}</TableHead>
                  <TableHead className="text-right">{t('table.credits')}</TableHead>
                  <TableHead className="text-right">{t('table.portfolio')}</TableHead>
                  <TableHead className="text-right">{t('table.collected')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="pr-4 text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <Link href={`/collectors/${row.id}`} className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                          {row.firstName[0]}
                          {row.lastName[0]}
                        </span>
                        <span>
                          <span className="block font-medium hover:underline">{row.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {row.mobile}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.routeNames.length > 0 ? row.routeNames.join(', ') : tc('none')}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.clients}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.activeCredits}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQ(row.portfolio, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatQ(row.collected, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.active ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <LinkButton
                        variant="ghost"
                        size="sm"
                        href={`/collectors/${row.id}`}
                        >
                        {tc('view')}
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
