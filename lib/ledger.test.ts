import { describe, expect, it } from 'vitest'

import {
  type LedgerRow,
  outstandingCents,
  payoffState,
  payoffTotalCents,
  recalculateBalances,
  toCents,
} from '@/lib/ledger'

/** Terse row builder: `row(1, 'payment', 200)`, voided with a trailing flag. */
function row(
  id: number,
  kind: LedgerRow['kind'],
  amount: number,
  voided = false,
): LedgerRow {
  return { id, kind, amountCents: toCents(amount), voided }
}

function dated(r: LedgerRow, entryDate: string) {
  return { ...r, entryDate }
}

const balances = (rows: LedgerRow[]) =>
  recalculateBalances(rows).map((r) => r.runningBalanceCents)

describe('payoffTotalCents', () => {
  it('adds the flat 15%', () => {
    expect(payoffTotalCents(1500)).toBe(toCents(1725))
    expect(payoffTotalCents(6500)).toBe(toCents(7475))
  })

  it('rounds to the centavo instead of carrying float error', () => {
    // 333.33 * 1.15 = 383.3295 in exact arithmetic, 383.32949999… in floats.
    expect(payoffTotalCents(333.33)).toBe(38333)
  })

  it('honours a per-credit rate so historical credits survive a rate change', () => {
    expect(payoffTotalCents(1000, 0.2)).toBe(toCents(1200))
  })

  it('accepts the string form a Prisma Decimal serialises to', () => {
    expect(payoffTotalCents('1500.00', '0.1500')).toBe(toCents(1725))
  })
})

describe('recalculateBalances', () => {
  it('opens at the origination amount and decrements each payment', () => {
    const rows = [
      row(1, 'origination', 1725),
      row(2, 'payment', 200),
      row(3, 'payment', 200),
    ]
    expect(balances(rows)).toEqual([toCents(1725), toCents(1525), toCents(1325)])
  })

  it('leaves the balance flat across a voided payment', () => {
    const rows = [
      row(1, 'origination', 2070),
      row(2, 'payment', 250),
      row(3, 'payment', 250, true),
      row(4, 'payment', 250),
    ]
    expect(balances(rows)).toEqual([
      toCents(2070),
      toCents(1820),
      toCents(1820), // the voided row contributes nothing
      toCents(1570),
    ])
  })

  it('re-derives every later balance when a mid-sequence payment is voided', () => {
    const before = [
      row(1, 'origination', 1725),
      row(2, 'payment', 300),
      row(3, 'payment', 300),
      row(4, 'payment', 300),
    ]
    expect(balances(before)).toEqual([
      toCents(1725),
      toCents(1425),
      toCents(1125),
      toCents(825),
    ])

    const after = before.map((r) => (r.id === 3 ? { ...r, voided: true } : r))
    expect(balances(after)).toEqual([
      toCents(1725),
      toCents(1425),
      toCents(1425),
      toCents(1125), // not 825 — the cascade is the whole point
    ])
  })

  it('stays exact across amounts that lose precision in floats', () => {
    const rows = [
      row(1, 'origination', 1725),
      ...Array.from({ length: 3 }, (_, i) => row(i + 2, 'payment', 0.1)),
    ]
    expect(balances(rows).at(-1)).toBe(toCents(1724.7))
  })

  it('returns nothing for a credit with no rows', () => {
    expect(recalculateBalances([])).toEqual([])
    expect(outstandingCents([])).toBe(0)
  })

  it('never reports a negative outstanding balance', () => {
    const rows = [row(1, 'origination', 100), row(2, 'payment', 150)]
    expect(outstandingCents(rows)).toBe(0)
  })
})

describe('payoffState', () => {
  const start = '2024-02-05'

  it('cancels on the final payment when payoff was inside 30 days', () => {
    const rows = [
      dated(row(1, 'origination', 2530), start),
      dated(row(2, 'payment', 700), '2024-02-12'),
      dated(row(3, 'payment', 700), '2024-02-19'),
      dated(row(4, 'payment', 700), '2024-02-26'),
      dated(row(5, 'payment', 430), '2024-03-01'),
    ]
    expect(payoffState(start, rows)).toEqual({
      paidOff: true,
      cancelledAt: '2024-03-01', // 25 days
      badRecord: false,
    })
  })

  it('flags a bad record when payoff took more than 30 days', () => {
    const from = '2023-10-02'
    const rows = [
      dated(row(1, 'origination', 1725), from),
      dated(row(2, 'payment', 575), '2023-10-23'),
      dated(row(3, 'payment', 575), '2023-11-20'),
      dated(row(4, 'payment', 575), '2023-12-11'),
    ]
    expect(payoffState(from, rows)).toEqual({
      paidOff: true,
      cancelledAt: '2023-12-11', // 70 days
      badRecord: true,
    })
  })

  it('treats exactly 30 days as a clean record', () => {
    const rows = [
      dated(row(1, 'origination', 100), '2024-01-01'),
      dated(row(2, 'payment', 100), '2024-01-31'),
    ]
    expect(payoffState('2024-01-01', rows).badRecord).toBe(false)
  })

  it('leaves a credit open while it still owes', () => {
    const rows = [
      dated(row(1, 'origination', 1725), start),
      dated(row(2, 'payment', 200), '2024-02-12'),
    ]
    expect(payoffState(start, rows)).toEqual({
      paidOff: false,
      cancelledAt: null,
      badRecord: false,
    })
  })

  it('reopens a credit when the payment that cleared it is voided', () => {
    const rows = [
      dated(row(1, 'origination', 300), start),
      dated(row(2, 'payment', 300), '2024-02-12'),
    ]
    expect(payoffState(start, rows).paidOff).toBe(true)

    const voided = rows.map((r) => (r.id === 2 ? { ...r, voided: true } : r))
    expect(payoffState(start, voided).paidOff).toBe(false)
  })

  it('measures to the last live row, not the row that zeroed the balance', () => {
    // The legacy query reads the last non-voided row by id, so a back-dated
    // payment posted after payoff still moves the record date.
    const rows = [
      dated(row(1, 'origination', 500), '2024-01-01'),
      dated(row(2, 'payment', 500), '2024-01-10'),
      dated(row(3, 'payment', 0), '2024-03-01'),
    ]
    expect(payoffState('2024-01-01', rows).cancelledAt).toBe('2024-03-01')
  })
})
