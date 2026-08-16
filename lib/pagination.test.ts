import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PAGE_SIZE,
  firstParam,
  paged,
  pageParams,
  parsePage,
  searchTerms,
} from './pagination'

describe('parsePage', () => {
  it('defaults to the first page', () => {
    expect(parsePage(undefined)).toBe(1)
    expect(parsePage('')).toBe(1)
  })

  it('reads a page number', () => {
    expect(parsePage('3')).toBe(3)
    expect(parsePage(['3'])).toBe(3)
  })

  it('refuses anything that is not a positive whole number', () => {
    // A hand-edited URL should show page one, not send `skip: NaN` to Prisma.
    for (const bad of ['0', '-1', '2.5', 'abc', '1e3', ' ']) {
      expect(parsePage(bad)).toBe(1)
    }
  })
})

describe('pageParams', () => {
  it('turns a page into skip/take', () => {
    expect(pageParams(1, 500)).toMatchObject({ page: 1, skip: 0, take: DEFAULT_PAGE_SIZE })
    expect(pageParams(3, 500)).toMatchObject({ page: 3, skip: 100, take: DEFAULT_PAGE_SIZE })
  })

  it('clamps past the end, so a filtered-down list is not an empty table', () => {
    // 57,131 payments is 1,143 pages; filter to 20 rows while on page 900 and
    // the screen should show the one page that has rows.
    expect(pageParams(900, 20).page).toBe(1)
    expect(pageParams(12, 120).page).toBe(3)
  })

  it('clamps below the start', () => {
    expect(pageParams(0, 500).page).toBe(1)
    expect(pageParams(-5, 500).page).toBe(1)
  })

  it('treats an empty list as a single page', () => {
    expect(pageParams(1, 0)).toMatchObject({ page: 1, skip: 0 })
    expect(pageParams(4, 0).page).toBe(1)
  })

  it('accepts a custom page size', () => {
    expect(pageParams(2, 100, 10)).toMatchObject({ page: 2, perPage: 10, skip: 10, take: 10 })
  })
})

describe('paged', () => {
  const rows = Array.from({ length: 50 }, (_, i) => i)

  it('reports the window it returned', () => {
    const result = paged(rows, 500, pageParams(1, 500))
    expect(result).toMatchObject({ page: 1, pageCount: 10, from: 1, to: 50, total: 500 })
  })

  it('reports a short last page', () => {
    const last = Array.from({ length: 7 }, (_, i) => i)
    const result = paged(last, 507, pageParams(11, 507))
    expect(result).toMatchObject({ page: 11, pageCount: 11, from: 501, to: 507 })
  })

  it('reports zeroes for an empty result rather than 1–0', () => {
    const result = paged([], 0, pageParams(1, 0))
    expect(result).toMatchObject({ total: 0, pageCount: 1, from: 0, to: 0 })
  })

  it('counts the real book', () => {
    // 57,131 payments at 50 a page.
    const result = paged(rows, 57_131, pageParams(1, 57_131))
    expect(result.pageCount).toBe(1143)
  })
})

describe('searchTerms', () => {
  it('splits on whitespace so either half of a name matches', () => {
    expect(searchTerms('martha ordoñez')).toEqual(['martha', 'ordoñez'])
    expect(searchTerms('  ordoñez   martha ')).toEqual(['ordoñez', 'martha'])
  })

  it('is empty for nothing to search', () => {
    expect(searchTerms(undefined)).toEqual([])
    expect(searchTerms('   ')).toEqual([])
  })

  it('caps the number of terms, so a pasted paragraph is not a query plan', () => {
    expect(searchTerms('a b c d e f g h i j')).toHaveLength(6)
  })
})

describe('firstParam', () => {
  it('takes the first value and trims it', () => {
    expect(firstParam(' ordoñez ')).toBe('ordoñez')
    expect(firstParam(['a', 'b'])).toBe('a')
  })

  it('is undefined for blank, so an empty box is not a filter', () => {
    expect(firstParam(undefined)).toBeUndefined()
    expect(firstParam('')).toBeUndefined()
    expect(firstParam('   ')).toBeUndefined()
  })
})
