'use client'

import { useState } from 'react'
import {
  Bell,
  Banknote,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Landmark,
  Route,
  Search,
  Settings,
  Users,
  UserCog,
  Wallet,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Link, usePathname } from '@/i18n/navigation'

/** Mirrors the old app's two `user.permissions` values (0 = admin, 1 = collector). */
export type Role = 'admin' | 'collector'

type NavItem = {
  /** Key under the `nav` message namespace. */
  key: string
  href: string
  icon: React.ElementType
  roles: Role[]
}
type NavGroup = { key: string; items: NavItem[] }

// URL paths stay in English and are never localized — only the labels are.
const nav: NavGroup[] = [
  {
    key: 'overview',
    items: [
      { key: 'dashboard', href: '/', icon: LayoutDashboard, roles: ['admin'] },
    ],
  },
  {
    key: 'portfolio',
    items: [
      { key: 'clients', href: '/clients', icon: Users, roles: ['admin'] },
      { key: 'credits', href: '/credits', icon: CreditCard, roles: ['admin'] },
      { key: 'payments', href: '/payments', icon: Wallet, roles: ['admin'] },
    ],
  },
  {
    key: 'operations',
    items: [
      { key: 'dailyClose', href: '/daily-close', icon: Banknote, roles: ['admin'] },
      { key: 'collectors', href: '/collectors', icon: UserCog, roles: ['admin'] },
      { key: 'routes', href: '/routes', icon: Route, roles: ['admin'] },
    ],
  },
  {
    key: 'insights',
    items: [
      { key: 'reports', href: '/reports', icon: FileText, roles: ['admin'] },
      { key: 'admin', href: '/admin/users', icon: Settings, roles: ['admin'] },
    ],
  },
  {
    key: 'field',
    items: [
      { key: 'fieldCollect', href: '/field/collect', icon: Wallet, roles: ['collector'] },
      { key: 'fieldToday', href: '/field/today', icon: FileText, roles: ['collector'] },
    ],
  },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

function SidebarContent({
  pathname,
  role,
  userName,
}: {
  pathname: string
  role: Role
  userName: string
}) {
  const t = useTranslations('nav')
  const tApp = useTranslations('app')
  const tRoles = useTranslations('roles')

  const groups = nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-full flex-col gap-1">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Landmark className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">{tApp('name')}</div>
          <div className="text-xs text-muted-foreground">{tApp('tagline')}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="px-2 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground/70 uppercase">
              {t(`groups.${group.key}`)}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href)
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-4 shrink-0',
                          active
                            ? 'text-sidebar-primary'
                            : 'text-muted-foreground group-hover:text-sidebar-foreground',
                        )}
                      />
                      {t(item.key)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{userName}</div>
            <div className="truncate text-xs text-muted-foreground">{tRoles(role)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppShell({
  children,
  title,
  role = 'admin',
  userName = 'Centauro',
}: {
  children: React.ReactNode
  title?: string
  /** Supplied by the session once auth lands in Phase 3. */
  role?: Role
  userName?: string
}) {
  const t = useTranslations('shell')
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent pathname={pathname} role={role} userName={userName} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar">
            <div className="absolute top-4 right-3">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileOpen(false)}
                aria-label={t('closeMenu')}
              >
                <X className="size-4" />
              </Button>
            </div>
            <SidebarContent pathname={pathname} role={role} userName={userName} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t('openMenu')}
          >
            <Menu className="size-4" />
          </Button>

          {title && (
            <h1 className="text-sm font-semibold tracking-tight sm:text-base">
              {title}
            </h1>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('search')}
                className="h-9 w-56 rounded-lg border border-input bg-card pr-3 pl-8.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
              />
            </div>
            <Button variant="ghost" size="icon" aria-label={t('notifications')} className="relative">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
