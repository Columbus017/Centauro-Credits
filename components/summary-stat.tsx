import { cn } from '@/lib/utils'

/**
 * Compact figure strip that sits above list tables. Lighter than `StatCard`,
 * which carries a delta chip and is reserved for the dashboard.
 */
export function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'default' | 'danger'
}) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-xl font-semibold tabular-nums',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  )
}
