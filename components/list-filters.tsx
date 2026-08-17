'use client'

import { Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { SelectField, type SelectOption } from '@/components/select-field'
import { usePathname, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export type FilterSelect = {
  /** The search param this select writes. */
  name: string
  /** The value meaning "no filter"; it is removed from the URL rather than set. */
  allValue: string
  options: SelectOption[]
  className?: string
}

/**
 * The filter bar above a paged table.
 *
 * **The filters are the URL**, the same contract `/reports` has had since
 * Phase 5: the server renders from search params, so a filtered list can be
 * linked, reloaded and paged through without a second copy of the state
 * living in the browser. `reports-ajax.js` kept two disconnected copies and
 * they disagreed the moment anyone edited a filter after generating a list.
 *
 * Phase 1 shipped these controls inert. With 511 clients that was untidy; with
 * 57,131 payments it means there is no way to find a payment at all, so search
 * and paging had to arrive together.
 */
export function ListFilters({
  searchPlaceholder,
  searchParamName = 'q',
  selects = [],
}: {
  searchPlaceholder: string
  searchParamName?: string
  selects?: FilterSelect[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(params.get(searchParamName) ?? '')

  // The Back button changes the URL without remounting this component; without
  // this the box would keep showing what was typed rather than what is filtered.
  const urlSearch = params.get(searchParamName) ?? ''
  const lastUrlSearch = useRef(urlSearch)
  useEffect(() => {
    if (lastUrlSearch.current !== urlSearch) {
      lastUrlSearch.current = urlSearch
      setSearch(urlSearch)
    }
  }, [urlSearch])

  function apply(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString())

    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, value)
    }

    // Any change to what is being filtered invalidates the page number — page
    // 40 of a search that now has two matches is an empty table.
    next.delete('page')

    const query = next.toString()
    startTransition(() => {
      // `replace`, not `push`: typing six characters should not put six entries
      // in the history for the Back button to walk out of.
      router.replace(query ? `${pathname}?${query}` : pathname)
    })
  }

  // Typing is not a navigation. Waiting for a pause keeps a 57,000-row table
  // from being re-queried once per keystroke.
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  function onSearchChange(value: string) {
    setSearch(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => apply({ [searchParamName]: value }), 300)
  }

  useEffect(() => () => clearTimeout(debounce.current), [])

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border p-4 transition-opacity sm:flex-row sm:items-center',
        isPending && 'opacity-60',
      )}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-8.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </div>

      {selects.map((select) => (
        <SelectField
          key={select.name}
          size="default"
          className={select.className ?? 'h-9 min-w-44'}
          options={select.options}
          defaultValue={params.get(select.name) ?? select.allValue}
          onValueChange={(value) =>
            apply({ [select.name]: value === select.allValue ? undefined : value })
          }
        />
      ))}
    </div>
  )
}
