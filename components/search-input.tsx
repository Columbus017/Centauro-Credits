import { Search } from 'lucide-react'

import { cn } from '@/lib/utils'

/** The search box that heads every list table. */
export function SearchInput({
  placeholder,
  className,
}: {
  placeholder: string
  className?: string
}) {
  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-8.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      />
    </div>
  )
}
