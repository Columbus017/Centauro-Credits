'use client'

import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { Link, usePathname } from '@/i18n/navigation'

const tabs = [
  { key: 'users', href: '/admin/users' },
  { key: 'settings', href: '/admin/settings' },
] as const

/**
 * Users and settings are separate routes rather than one tabbed page, so the
 * tab strip is a link group that highlights the active route.
 */
export function AdminTabs() {
  const t = useTranslations('admin.tabs')
  const pathname = usePathname()

  return (
    <div className="mb-6 inline-flex h-8 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'inline-flex h-full items-center rounded-md px-3 text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:text-foreground',
            )}
          >
            {t(tab.key)}
          </Link>
        )
      })}
    </div>
  )
}
