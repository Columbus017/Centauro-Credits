import { describe, expect, it } from 'vitest'

import { monthOf, recentMonths, today } from './clock'

describe('today', () => {
  it('reports the Guatemalan calendar day, not the container zone', () => {
    // 02:00 UTC on the 12th is still the 11th in Guatemala (UTC−6). A server
    // in UTC would roll the books over six hours early.
    expect(today(new Date('2026-08-12T02:00:00Z'))).toBe('2026-08-11')
    expect(today(new Date('2026-08-12T06:30:00Z'))).toBe('2026-08-12')
  })
})

describe('recentMonths', () => {
  it('ends with the month it is given and runs oldest first', () => {
    expect(recentMonths(6, '2026-08-11')).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ])
  })

  it('crosses a year boundary', () => {
    expect(recentMonths(3, '2026-02-01')).toEqual(['2025-12', '2026-01', '2026-02'])
  })
})

describe('monthOf', () => {
  it('takes the year and month of an ISO date', () => {
    expect(monthOf('2026-08-11')).toBe('2026-08')
  })
})
