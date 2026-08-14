import { getTranslations } from 'next-intl/server'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatReportCell, isNumericColumn } from '@/lib/reports'
import type { ReportResult } from '@/lib/queries/reports'

/**
 * The generated listing, as the screen shows it.
 *
 * Same columns, same order and same formatting as the PDF — both read
 * `reportColumns` and `formatReportCell`. The legacy screen built its table in
 * `reports-ajax.js` and its PDF in `ReportsPDF/*.php`, and the two had already
 * drifted: the AJAX table for the income report listed six columns that no PDF
 * ever rendered.
 */
export async function ReportTable({
  result,
  locale,
}: {
  result: ReportResult
  locale: string
}) {
  const t = await getTranslations('reports')

  if (result.rows.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {result.columns.map((column, index) => (
              <TableHead
                key={column.key}
                className={cn(
                  index === 0 && 'pl-4',
                  index === result.columns.length - 1 && 'pr-4',
                  isNumericColumn(column) && 'text-right',
                )}
              >
                {t(`columns.${column.key}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {result.columns.map((column, index) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    index === 0 && 'pl-4 font-mono text-xs font-medium',
                    index === result.columns.length - 1 && 'pr-4',
                    isNumericColumn(column) && 'text-right font-mono tabular-nums',
                  )}
                >
                  {formatReportCell(row[index], column.kind, locale)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
