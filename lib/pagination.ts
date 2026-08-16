/**
 * Page arithmetic for the list screens.
 *
 * Pure and client-safe on purpose: the page component needs `Paged` to render
 * a control, and the query layer needs `skip`/`take` to build a statement.
 *
 * Every list rendered in full until the real book arrived — 57,131 payments is
 * 297 MB of HTML and 23 seconds. Paging is not a nicety here; it is the
 * difference between a usable screen and one nobody can open.
 */

/** Rows per page. Fits a laptop screen without scrolling the header away. */
export const DEFAULT_PAGE_SIZE = 50

export type PageParams = {
  page: number
  perPage: number
  skip: number
  take: number
}

export type Paged<T> = {
  rows: T[]
  total: number
  page: number
  perPage: number
  pageCount: number
  /** 1-based index of the first row on this page; `0` when there are none. */
  from: number
  /** 1-based index of the last row on this page; `0` when there are none. */
  to: number
}

/**
 * A `?page=` search param as a page number.
 *
 * Anything that is not a positive whole number is page 1 — a hand-edited URL
 * should show the first page rather than an error, and `skip: NaN` would
 * otherwise reach Prisma.
 */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return 1

  // Plain digits only. `Number()` alone would read `1e3` as page 1000 and
  // `0x10` as 16 — clamping would survive both, but the address bar and the
  // page it shows should never say different things.
  if (!/^\d+$/.test(value.trim())) return 1

  const parsed = Number(value)
  return parsed >= 1 ? parsed : 1
}

/**
 * `skip`/`take` for a page, once the total is known.
 *
 * The page is clamped to what exists, so filtering a list down while on page 12
 * shows the last page with rows on it instead of an empty table. That means the
 * count query has to run first — one extra round trip, and the alternative is a
 * screen that looks broken.
 */
export function pageParams(page: number, total: number, perPage = DEFAULT_PAGE_SIZE): PageParams {
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  const clamped = Math.min(Math.max(page, 1), pageCount)

  return {
    page: clamped,
    perPage,
    skip: (clamped - 1) * perPage,
    take: perPage,
  }
}

/** Wraps a page of rows with everything the pagination control needs. */
export function paged<T>(rows: T[], total: number, params: PageParams): Paged<T> {
  const pageCount = Math.max(1, Math.ceil(total / params.perPage))

  return {
    rows,
    total,
    page: params.page,
    perPage: params.perPage,
    pageCount,
    from: total === 0 ? 0 : params.skip + 1,
    to: total === 0 ? 0 : params.skip + rows.length,
  }
}

/** The first search param value, for filters that arrive the same way. */
export function firstParam(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * A free-text search split into terms.
 *
 * Each term has to match somewhere in the row, so "ordoñez martha" finds the
 * same client as "martha ordoñez" — names are stored across `first_name` and
 * `last_name` and operators do not know which half they are typing.
 */
export function searchTerms(search: string | undefined): string[] {
  if (!search) return []
  return search.split(/\s+/).map((term) => term.trim()).filter(Boolean).slice(0, 6)
}
