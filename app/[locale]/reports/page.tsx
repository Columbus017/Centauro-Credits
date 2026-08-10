import { CalendarRange, Download, FileText, MapPin, UserCog } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppShell } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { recentReports, reportDefs } from '@/lib/mock-data'

const filterIcons = {
  dateRange: CalendarRange,
  route: MapPin,
  status: FileText,
  collector: UserCog,
} as const

export default async function ReportsPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('reports')
  const tc = await getTranslations('common')

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportDefs.map((report) => (
          <Card key={report.id} className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <FileText className="size-4.5" />
              </div>
              <CardTitle>{t(`defs.${report.id}.title`)}</CardTitle>
              <CardDescription>{t(`defs.${report.id}.description`)}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {report.filters.map((filter) => {
                  const Icon = filterIcons[filter]
                  return (
                    <span
                      key={filter}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      <Icon className="size-3" />
                      {t(`filterLabels.${filter}`)}
                    </span>
                  )
                })}
              </div>
              <Button size="lg" className="w-full">
                <Download className="size-4" />
                {t('generate')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="py-0">
        <CardHeader className="pt-6">
          <CardTitle>{t('recent')}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recentReports.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{t('recentEmpty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">{tc('name')}</TableHead>
                    <TableHead>{t('generatedBy')}</TableHead>
                    <TableHead>{tc('date')}</TableHead>
                    <TableHead className="pr-6 text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="pl-6 font-medium">
                        {t(`defs.${report.reportId}.title`)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{report.by}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(report.date, locale)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="size-3.5" />
                          {report.size}
                        </Button>
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
