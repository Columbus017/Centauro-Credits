'use client'

import { useState } from 'react'
import { FileText, ListFilter } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { FormField } from '@/components/form-field'
import { SelectField } from '@/components/select-field'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from '@/i18n/navigation'
import type { ReportFilter, ReportId } from '@/lib/reports'

/**
 * One report's filters, on its own card.
 *
 * The legacy screen ran the filters through jQuery AJAX into a DataTable and
 * kept a *second*, disconnected copy of them for the print button — the PDF
 * re-read the form fields at click time, so editing a filter after generating
 * the list printed something other than what was on screen. Here the filters
 * are the URL: the table and the PDF link are both rendered from it, and they
 * cannot drift.
 */
export function ReportForm({
  id,
  filters,
  collectors,
  today,
  monthStart,
  active,
}: {
  id: ReportId
  filters: readonly ReportFilter[]
  collectors: { value: string; label: string }[]
  today: string
  monthStart: string
  /** The filters already in the URL, so a submitted card stays filled in. */
  active: Record<string, string> | null
}) {
  const t = useTranslations('reports')
  const router = useRouter()

  const [collectorId, setCollectorId] = useState(
    active?.collectorId ?? collectors[0]?.value ?? '',
  )
  const [from, setFrom] = useState(active?.from ?? monthStart)
  const [to, setTo] = useState(active?.to ?? today)
  const [date, setDate] = useState(active?.date ?? today)

  function submit(event: React.FormEvent) {
    event.preventDefault()

    const query = new URLSearchParams({ report: id, collectorId })
    if (filters.includes('dateRange')) {
      query.set('from', from)
      query.set('to', to)
    }
    if (filters.includes('date')) query.set('date', date)

    router.push(`/reports?${query}`)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <FileText className="size-4.5" />
        </div>
        <CardTitle>{t(`defs.${id}.title`)}</CardTitle>
        <CardDescription>{t(`defs.${id}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <form onSubmit={submit} className="space-y-4">
          <FormField label={t('filterLabels.collector')}>
            <SelectField
              options={collectors}
              defaultValue={collectorId}
              onValueChange={setCollectorId}
              className="w-full"
            />
          </FormField>

          {filters.includes('dateRange') && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t('filterLabels.from')} htmlFor={`${id}-from`}>
                <Input
                  id={`${id}-from`}
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </FormField>
              <FormField label={t('filterLabels.to')} htmlFor={`${id}-to`}>
                <Input
                  id={`${id}-to`}
                  type="date"
                  value={to}
                  min={from}
                  onChange={(event) => setTo(event.target.value)}
                />
              </FormField>
            </div>
          )}

          {filters.includes('date') && (
            <FormField label={t('filterLabels.date')} htmlFor={`${id}-date`}>
              <Input
                id={`${id}-date`}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </FormField>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={!collectorId}>
            <ListFilter className="size-4" />
            {t('generate')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
