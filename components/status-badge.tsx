import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

/**
 * The real domain has far fewer states than the design mockup suggested.
 * Credits are `active` until fully paid, then `cancelled` — and `badRecord`
 * marks a credit that took more than 30 days to pay off. Ledger entries are
 * `posted` or `voided`. People (clients, collectors, users) are `active` or
 * `inactive` (soft-deleted).
 */
export type Status =
  | 'active'
  | 'inactive'
  | 'cancelled'
  | 'badRecord'
  | 'posted'
  | 'voided'

const tones: Record<Status, Tone> = {
  active: 'info',
  inactive: 'neutral',
  cancelled: 'success',
  badRecord: 'danger',
  posted: 'success',
  voided: 'danger',
}

const toneStyles: Record<Tone, string> = {
  success: 'bg-success/12 text-success ring-success/25',
  warning: 'bg-warning/15 text-warning-foreground ring-warning/40 dark:text-warning',
  danger: 'bg-destructive/12 text-destructive ring-destructive/25',
  neutral: 'bg-muted text-muted-foreground ring-border',
  info: 'bg-accent text-accent-foreground ring-accent-foreground/20',
}

const dotStyles: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground',
  info: 'bg-accent-foreground',
}

export function StatusBadge({
  status,
  className,
}: {
  status: Status
  className?: string
}) {
  const t = useTranslations('status')
  const tone = tones[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        toneStyles[tone],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dotStyles[tone])} />
      {t(status)}
    </span>
  )
}
