import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AdminTabs } from '@/components/admin-tabs'
import { AppShell } from '@/components/app-shell'
import { ActionButton } from '@/components/forms/action-button'
import { NewUserDialog } from '@/components/new-user-dialog'
import { PageHeader } from '@/components/page-header'
import { SearchInput } from '@/components/search-input'
import { SortableHead } from '@/components/sortable-head'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatRelative } from '@/lib/format'
import { firstParam, parseSort } from '@/lib/pagination'
import { collectorOptions, listUsers, USER_SORT_KEYS } from '@/lib/queries/entities'
import { setUserActive } from '@/lib/actions/users'
import { requireAdmin } from '@/lib/session'

export default async function AdminUsersPage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('admin.users')
  const tc = await getTranslations('common')
  const tRoles = await getTranslations('roles')
  const tt = await getTranslations('toast')

  const current = await requireAdmin()
  const query = await searchParams
  const sort = parseSort(firstParam(query.sort), firstParam(query.dir), USER_SORT_KEYS)

  const [users, collectors] = await Promise.all([listUsers(sort), collectorOptions()])

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />
      <AdminTabs />

      <Card className="py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput placeholder={t('searchPlaceholder')} />
          <NewUserDialog collectors={collectors} />
        </div>

        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label={t('table.user')}
                    sortKey="name"
                    current={sort}
                    searchParams={query}
                    className="pl-4"
                  />
                  <SortableHead
                    label={t('table.username')}
                    sortKey="username"
                    current={sort}
                    searchParams={query}
                  />
                  <SortableHead
                    label={t('table.role')}
                    sortKey="role"
                    current={sort}
                    searchParams={query}
                  />
                  <SortableHead
                    label={t('table.linkedCollector')}
                    sortKey="collector"
                    current={sort}
                    searchParams={query}
                  />
                  <SortableHead
                    label={t('table.lastActive')}
                    sortKey="lastActive"
                    current={sort}
                    searchParams={query}
                  />
                  <SortableHead
                    label={tc('status')}
                    sortKey="status"
                    current={sort}
                    searchParams={query}
                  />
                  <TableHead className="pr-4 text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="pl-4">
                        <span className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </span>
                          <span className="font-medium">{user.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {user.username}
                      </TableCell>
                      <TableCell>{tRoles(user.role)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.collectorId ? user.collectorName : tc('none')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelative(user.lastLoginAt, locale)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.active ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {/* An admin cannot lock themselves out. */}
                        {user.id !== current.id && (
                          <ActionButton
                            action={setUserActive}
                            fields={{ id: user.id, active: String(!user.active) }}
                            toastMessage={
                              user.active ? tt('userDeactivated') : tt('userActivated')
                            }
                          >
                            {user.active ? tc('deactivate') : tc('activate')}
                          </ActionButton>
                        )}
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
