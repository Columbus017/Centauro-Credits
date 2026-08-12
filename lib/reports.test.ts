import { describe, expect, it } from 'vitest'

import {
  formatReportCell,
  isReportId,
  parseReportParams,
  reportColumns,
  reportDefs,
  reportTotals,
  sumBy,
  withinRange,
} from './reports'

describe('report definitions', () => {
  it('scopes every report to exactly one collector', () => {
    // All three legacy forms opened with a mandatory *Cobrador* select. The
    // Phase 1 placeholder guessed at `route` and `status` filters that no
    // report ever had.
    for (const def of reportDefs) {
      expect(def.filters).toContain('collector')
    }
  })

  it('totals a column the report actually renders', () => {
    for (const def of reportDefs) {
      const key = reportTotals[def.id]
      if (key === null) continue
      expect(reportColumns[def.id].map((column) => column.key)).toContain(key)
    }
  })

  it('lays every column out across the full page width', () => {
    for (const def of reportDefs) {
      const width = sumBy(reportColumns[def.id], (column) => column.width)
      expect(width).toBe(100)
    }
  })

  it('recognises only the three real reports', () => {
    expect(isReportId('credits')).toBe(true)
    expect(isReportId('customersByCollector')).toBe(true)
    expect(isReportId('incomeByCollector')).toBe(true)
    expect(isReportId('dashboard')).toBe(false)
    expect(isReportId('../../etc/passwd')).toBe(false)
  })
})

describe('parseReportParams', () => {
  it('coerces the collector id and keeps dates as written', () => {
    expect(parseReportParams('incomeByCollector', { collectorId: '3', date: '2026-08-11' })).toEqual(
      { collectorId: 3, date: '2026-08-11' },
    )
  })

  it('refuses a collector id that is not a positive integer', () => {
    for (const collectorId of ['0', '-1', '2.5', 'abc', '']) {
      expect(parseReportParams('customersByCollector', { collectorId })).toBeNull()
    }
    // `1 OR 1=1` reached the legacy `SELECT` unquoted; here it never becomes a
    // number in the first place.
    expect(parseReportParams('customersByCollector', { collectorId: '1 OR 1=1' })).toBeNull()
  })

  it('refuses anything but an ISO date', () => {
    // The legacy forms fed `d/m/Y` through `strtotime()`, which reads
    // `01/02/2026` as January 2nd.
    expect(parseReportParams('incomeByCollector', { collectorId: '1', date: '01/02/2026' })).toBeNull()
    expect(parseReportParams('incomeByCollector', { collectorId: '1', date: '2026-8-1' })).toBeNull()
    expect(parseReportParams('incomeByCollector', { collectorId: '1' })).toBeNull()
  })

  it('refuses an inverted date range but accepts a single day', () => {
    const params = { collectorId: '1', from: '2026-03-31', to: '2026-01-01' }
    expect(parseReportParams('credits', params)).toBeNull()
    expect(
      parseReportParams('credits', { collectorId: '1', from: '2026-01-01', to: '2026-01-01' }),
    ).toEqual({ collectorId: 1, from: '2026-01-01', to: '2026-01-01' })
  })

  it('ignores parameters the report does not take', () => {
    expect(
      parseReportParams('customersByCollector', { collectorId: '4', from: '2026-01-01' }),
    ).toEqual({ collectorId: 4 })
  })
})

describe('withinRange', () => {
  it('includes both ends, as SQL BETWEEN did', () => {
    expect(withinRange('2026-01-01', '2026-01-01', '2026-03-31')).toBe(true)
    expect(withinRange('2026-03-31', '2026-01-01', '2026-03-31')).toBe(true)
    expect(withinRange('2025-12-31', '2026-01-01', '2026-03-31')).toBe(false)
    expect(withinRange('2026-04-01', '2026-01-01', '2026-03-31')).toBe(false)
  })

  it('compares across a year boundary without parsing a date', () => {
    expect(withinRange('2026-01-02', '2025-12-30', '2026-01-03')).toBe(true)
  })
})

describe('formatReportCell', () => {
  it('renders money to the centavo in quetzales', () => {
    // Both locales separate the symbol from the amount with a non-breaking
    // space; the tests pin the code point so a stray plain space fails here
    // rather than in a printed report.
    expect(formatReportCell(1150, 'money', 'es')).toBe('Q\u00a01,150.00')
    expect(formatReportCell(1150, 'money', 'en')).toBe('Q\u00a01,150.00')
    expect(formatReportCell(0, 'money', 'es')).toBe('Q\u00a00.00')
  })

  it('renders dates short in the reader locale', () => {
    expect(formatReportCell('2026-08-11', 'date', 'es')).toBe('11/08/2026')
    expect(formatReportCell('2026-08-11', 'date', 'en')).toBe('08/11/2026')
  })

  it('shows a dash where the legacy report showed today', () => {
    // `Credits.php` read `$credits['dateP']` from a column it aliased `fechaP`
    // and handed the undefined value to `date_create()`, which answers *now*.
    expect(formatReportCell(null, 'date', 'es')).toBe('—')
    expect(formatReportCell('', 'text', 'es')).toBe('—')
  })

  it('leaves text and card numbers alone', () => {
    expect(formatReportCell('C-0142', 'code', 'es')).toBe('C-0142')
    expect(formatReportCell('Ana Ramírez', 'text', 'es')).toBe('Ana Ramírez')
  })
})
