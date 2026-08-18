import { ChevronDown, ChevronUp } from 'lucide-react'

import { TableHead } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import type { SortState } from '@/lib/pagination'
import { cn } from '@/lib/utils'

/**
 * A clickable column header, built the same way `Pagination`'s `PageLink`
 * is: a server-rendered link over the current search params, so sorting is a
 * navigation rather than a client-side state change.
 *
 * Cycles unsorted → ascending → descending → unsorted. Sorting always drops
 * `page` from the query, for the same reason `ListFilters.apply()` already
 * does — a page number computed against yesterday's order is very likely the
 * wrong page against today's.
 */
export function SortableHead<K extends string>({
  label,
  sortKey,
  current,
  searchParams,
  align,
  className,
}: {
  label: string
  sortKey: K
  current: SortState<K>
  searchParams: Record<string, string | string[] | undefined>
  align?: 'right'
  className?: string
}) {
  const active = current?.key === sortKey
  const nextDir = !active ? 'asc' : current.dir === 'asc' ? 'desc' : null

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'sort' || key === 'dir' || key === 'page' || value === undefined) continue
    for (const entry of Array.isArray(value) ? value : [value]) query.append(key, entry)
  }
  if (nextDir) {
    query.set('sort', sortKey)
    query.set('dir', nextDir)
  }

  return (
    <TableHead className={className}>
      <Link
        href={`?${query.toString()}`}
        className={cn(
          'inline-flex items-center gap-1 text-foreground hover:text-foreground/80',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        <span className="flex flex-col leading-none">
          <ChevronUp
            className={cn(
              'size-3',
              active && current.dir === 'asc' ? 'text-foreground' : 'text-muted-foreground/40',
            )}
          />
          <ChevronDown
            className={cn(
              '-mt-1 size-3',
              active && current.dir === 'desc' ? 'text-foreground' : 'text-muted-foreground/40',
            )}
          />
        </span>
      </Link>
    </TableHead>
  )
}
