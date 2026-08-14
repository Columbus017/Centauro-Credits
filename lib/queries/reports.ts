import 'server-only'

import { db } from '@/lib/db'
import { fromDbAmount, fromDbDate, isoDate } from '@/lib/db-utils'
import { fromCents, payoffTotalCents } from '@/lib/ledger'
import { listCredits } from '@/lib/queries/credits'
import {
  reportColumns,
  reportTotals,
  sumBy,
  type ReportColumn,
  type ReportId,
  type ReportParams,
} from '@/lib/reports'

/**
 * The three legacy reports as data, in the column order `lib/reports.ts`
 * declares. Rows are positional so the `/reports` table and the PDF document
 * render the same dataset without either owning a column list of its own.
 *
 * Values are raw — ISO dates and plain numbers — and each renderer formats
 * them for its own locale. `BLL/rpt*.php` returned pre-formatted strings, and
 * one of them (`rptIncomesByColl`) formatted `dateStart` as `d/m/Y` while its
 * two siblings returned `Y-m-d`, so the same column printed two ways.
 */
export type ReportCell = string | number | null

export type ReportResult = {
  id: ReportId
  columns: ReportColumn[]
  rows: ReportCell[][]
  /** The single figure the legacy form showed above the table, if any. */
  total: { key: string; value: number } | null
  collectorName: string
}

function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`
}

/**
 * The collector every report is scoped to.
 *
 * Deactivated collectors are found here on purpose. The legacy subselect
 * carried `AND state = 0`, so running a report for a retired collector printed
 * a heading with a blank name over a table that still had rows in it.
 */
async function collectorName(collectorId: number) {
  const collector = await db.collector.findUnique({ where: { id: collectorId } })
  return collector ? fullName(collector) : null
}

function build(
  id: ReportId,
  collector: string,
  rows: ReportCell[][],
  totalValue: number | null,
): ReportResult {
  const key = reportTotals[id]
  return {
    id,
    columns: reportColumns[id],
    rows,
    total: key && totalValue !== null ? { key, value: totalValue } : null,
    collectorName: collector,
  }
}

/**
 * *Clientes por cobrador* — every live credit on one collector's round with
 * what it still owes, and the "Total por recaudar" underneath.
 *
 * `CustByCol.php` read the balance off the last `balance` row and summed the
 * column in browser JavaScript, in floats. Both numbers are derived here:
 * `outstanding` walks the ledger through `lib/ledger.ts`, so a voided payment
 * that left a stale stored balance behind cannot inflate the round.
 */
async function customersByCollector({
  collectorId,
}: ReportParams['customersByCollector']): Promise<ReportResult | null> {
  const collector = await collectorName(collectorId)
  if (!collector) return null

  const credits = await listCredits({ collectorId }, { status: 'active' })
  // `ORDER BY dateStart ASC`, as all three legacy reports did; `listCredits`
  // orders by card number for the screens.
  credits.sort((a, b) => a.startDate.localeCompare(b.startDate))

  return build(
    'customersByCollector',
    collector,
    credits.map((credit) => [
      credit.code,
      credit.startDate,
      credit.customerName,
      credit.commerceName,
      credit.routeName,
      credit.outstanding,
    ]),
    sumBy(credits, (credit) => credit.outstanding),
  )
}

/**
 * *Créditos terminados por cobrador* — credits that reached zero inside a date
 * range, with the day they closed.
 *
 * `Credits.php` printed that last column from `$credits['dateP']`, a key its
 * own query never selected — it aliased the column `fechaP`. PHP handed the
 * undefined value to `date_create()`, which answers *now*, so every row of
 * every run showed the date the report was printed.
 */
async function credits({
  collectorId,
  from,
  to,
}: ReportParams['credits']): Promise<ReportResult | null> {
  const collector = await collectorName(collectorId)
  if (!collector) return null

  const rows = await listCredits({ collectorId }, { cancelledBetween: { from, to } })
  rows.sort((a, b) => a.startDate.localeCompare(b.startDate))

  return build(
    'credits',
    collector,
    rows.map((credit) => [
      credit.code,
      credit.startDate,
      credit.customerName,
      credit.commerceName,
      credit.routeName,
      credit.totalDue,
      credit.cancelledAt,
    ]),
    null,
  )
}

/**
 * *Ingresos por fecha* — the payments one collector booked on one day.
 *
 * This is the report that never had a PDF: `reports.php` renders an *Imprimir*
 * button calling `printReport3()`, and no such function is defined anywhere in
 * `js/`. It printed nothing and threw a ReferenceError instead.
 */
async function incomeByCollector({
  collectorId,
  date,
}: ReportParams['incomeByCollector']): Promise<ReportResult | null> {
  const collector = await collectorName(collectorId)
  if (!collector) return null

  const entries = await db.ledgerEntry.findMany({
    where: {
      kind: 'payment',
      deletedAt: null,
      // `B.state = 0` in the legacy query: a voided payment is not income.
      voidedAt: null,
      entryDate: isoDate(date),
      credit: { deletedAt: null, collectorId },
    },
    include: { credit: { include: { customer: { include: { commerce: true } } } } },
    orderBy: { id: 'asc' },
  })

  return build(
    'incomeByCollector',
    collector,
    entries.map((entry) => [
      entry.credit.code,
      fromDbDate(entry.credit.startDate),
      fullName(entry.credit.customer),
      entry.credit.customer.commerce?.name ?? '—',
      fromCents(
        payoffTotalCents(
          entry.credit.principal.toString(),
          entry.credit.interestRate.toString(),
        ),
      ),
      fromDbAmount(entry.amount),
    ]),
    sumBy(entries, (entry) => fromDbAmount(entry.amount)),
  )
}

/**
 * Runs one report. `null` means the collector does not exist, which the screen
 * and the API route both answer as a 404 — the same answer a bad credit id
 * gets, and for the same reason.
 */
export function runReport<T extends ReportId>(
  id: T,
  params: ReportParams[T],
): Promise<ReportResult | null> {
  switch (id) {
    case 'customersByCollector':
      return customersByCollector(params as ReportParams['customersByCollector'])
    case 'credits':
      return credits(params as ReportParams['credits'])
    case 'incomeByCollector':
      return incomeByCollector(params as ReportParams['incomeByCollector'])
    default:
      throw new Error(`Unknown report: ${id}`)
  }
}
