import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { formatNumber } from '@/lib/format'
import type { Paged } from '@/lib/pagination'
import { cn } from '@/lib/utils'

/**
 * The control under every paged table.
 *
 * Plain links rather than a Client Component: paging is a navigation, the
 * server renders the next page anyway, and a link works before hydration and
 * opens in a new tab if someone middle-clicks it.
 */
export async function Pagination({
  result,
  searchParams,
  locale,
}: {
  result: Pick<Paged<unknown>, 'page' | 'pageCount' | 'total' | 'from' | 'to'>
  /** The current query, so paging preserves the filters that produced it. */
  searchParams: Record<string, string | string[] | undefined>
  locale: string
}) {
  const t = await getTranslations('pagination')

  // One page of results needs no control, but the count is still worth saying:
  // "57,131" is the fact that explains why this screen has a control at all.
  const { page, pageCount, total, from, to } = result

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground tabular-nums">
        {total === 0
          ? t('empty')
          : t('showing', {
              from: formatNumber(from, locale),
              to: formatNumber(to, locale),
              total: formatNumber(total, locale),
            })}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <PageLink
            searchParams={searchParams}
            page={page - 1}
            disabled={page <= 1}
            label={t('previous')}
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">{t('previous')}</span>
          </PageLink>

          <span className="px-1 text-sm text-muted-foreground tabular-nums">
            {t('page', {
              page: formatNumber(page, locale),
              pageCount: formatNumber(pageCount, locale),
            })}
          </span>

          <PageLink
            searchParams={searchParams}
            page={page + 1}
            disabled={page >= pageCount}
            label={t('next')}
          >
            <span className="hidden sm:inline">{t('next')}</span>
            <ChevronRight className="size-4" />
          </PageLink>
        </div>
      )}
    </div>
  )
}

function PageLink({
  searchParams,
  page,
  disabled,
  label,
  children,
}: {
  searchParams: Record<string, string | string[] | undefined>
  page: number
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  const className = cn(
    'inline-flex h-9 items-center gap-1 rounded-lg border border-input px-3 text-sm font-medium transition-colors',
    disabled
      ? 'pointer-events-none opacity-50'
      : 'hover:bg-accent hover:text-accent-foreground',
  )

  // At either end the control still occupies its space, so the table does not
  // shift as you move through the pages.
  if (disabled) {
    return (
      <span aria-disabled className={className}>
        {children}
      </span>
    )
  }

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page' || value === undefined) continue
    for (const entry of Array.isArray(value) ? value : [value]) query.append(key, entry)
  }
  query.set('page', String(page))

  return (
    <Link href={`?${query.toString()}`} aria-label={label} className={className}>
      {children}
    </Link>
  )
}
