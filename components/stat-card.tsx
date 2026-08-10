import { TrendingDown, TrendingUp } from 'lucide-react'

import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  delta,
  trend,
  hint,
  positiveIsGood = true,
}: {
  label: string
  value: string
  delta?: number
  trend?: 'up' | 'down'
  hint?: string
  positiveIsGood?: boolean
}) {
  const good =
    trend === 'up' ? positiveIsGood : trend === 'down' ? !positiveIsGood : true

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
          {value}
        </span>
        {typeof delta === 'number' && (
          <span
            className={cn(
              'mb-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
              good
                ? 'bg-success/12 text-success'
                : 'bg-destructive/12 text-destructive',
            )}
          >
            {trend === 'down' ? (
              <TrendingDown className="size-3" />
            ) : (
              <TrendingUp className="size-3" />
            )}
            {delta > 0 ? '+' : ''}
            {delta}%
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
