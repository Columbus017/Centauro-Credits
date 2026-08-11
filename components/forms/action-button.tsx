'use client'

import { useTranslations } from 'next-intl'
import { useFormStatus } from 'react-dom'
import { useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'

/**
 * A one-click write: deactivate a route, void a payment, delete a credit.
 *
 * A real `<form>` rather than an `onClick`, so it is a POST that works without
 * JavaScript and cannot be replayed by a prefetch.
 */
export function ActionButton({
  action,
  fields,
  children,
  variant = 'outline',
  size = 'sm',
  className,
  confirm,
}: {
  action: (formData: FormData) => void | Promise<void>
  /** Hidden inputs, e.g. `{ id: 12, active: 'false' }`. */
  fields: Record<string, string | number>
  children: React.ReactNode
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
  /** Text for a confirmation prompt; omit for actions that need none. */
  confirm?: string
}) {
  const locale = useLocale()

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault()
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Submit variant={variant} size={size} className={className}>
        {children}
      </Submit>
    </form>
  )
}

function Submit({
  children,
  variant,
  size,
  className,
}: {
  children: React.ReactNode
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
}) {
  // `useFormStatus` reads the enclosing form, so it has to be its own component.
  const { pending } = useFormStatus()
  const tc = useTranslations('common')

  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending}>
      {pending ? tc('saving') : children}
    </Button>
  )
}
