import { describe, expect, it } from 'vitest'

import { filterOptions, normalizeForSearch } from './option-search'

/** A collector's round, shaped as the daily-close page builds it. */
const credits = [
  { value: '1', label: '1047', detail: 'Juan Pérez' },
  { value: '2', label: '1050', detail: 'Ana Pérez' },
  { value: '3', label: '2104', detail: 'Martha Ordóñez' },
  { value: '4', label: '3312', detail: 'Luis Similox' },
]

describe('normalizeForSearch', () => {
  it('strips the accents an operator does not type', () => {
    expect(normalizeForSearch('Pérez')).toBe('perez')
    expect(normalizeForSearch('Ordóñez')).toBe('ordonez')
  })

  it('lowercases and collapses whitespace', () => {
    expect(normalizeForSearch('  Juan   PÉREZ ')).toBe('juan perez')
  })

  it('leaves digits alone', () => {
    expect(normalizeForSearch('1047')).toBe('1047')
  })
})

describe('filterOptions', () => {
  it('returns everything for an empty query', () => {
    expect(filterOptions(credits, '')).toHaveLength(4)
    expect(filterOptions(credits, '   ')).toHaveLength(4)
  })

  it('matches a substring of the card number, not just a prefix', () => {
    // The point of the whole spec: `047` has to find `1047`.
    expect(filterOptions(credits, '047').map((c) => c.label)).toEqual(['1047'])
  })

  it('matches on the detail line alone', () => {
    expect(filterOptions(credits, 'similox').map((c) => c.label)).toEqual(['3312'])
  })

  it('matches an accented name typed without accents', () => {
    expect(filterOptions(credits, 'perez').map((c) => c.label)).toEqual(['1047', '1050'])
    expect(filterOptions(credits, 'ordonez').map((c) => c.label)).toEqual(['2104'])
  })

  it('ANDs the terms across both lines', () => {
    // "perez" alone matches two credits; the second term picks one of them.
    expect(filterOptions(credits, 'perez 104').map((c) => c.label)).toEqual(['1047'])
    expect(filterOptions(credits, 'perez 1050').map((c) => c.label)).toEqual(['1050'])
  })

  it('does not care what order the terms come in', () => {
    expect(filterOptions(credits, 'juan 1047')).toEqual(filterOptions(credits, '1047 juan'))
  })

  it('returns nothing when a term matches no option', () => {
    expect(filterOptions(credits, '9999')).toEqual([])
    expect(filterOptions(credits, 'perez 9999')).toEqual([])
  })

  it('handles options with no detail line', () => {
    const routes = [{ value: '1', label: 'Zona 1' }, { value: '2', label: 'Zona 12' }]
    expect(filterOptions(routes, 'zona 12').map((r) => r.label)).toEqual(['Zona 12'])
  })
})
