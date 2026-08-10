import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AdminTabs } from '@/components/admin-tabs'
import { AppShell } from '@/components/app-shell'
import { NewUserDialog } from '@/components/new-user-dialog'
import { PageHeader } from '@/components/page-header'
import { SearchInput } from '@/components/search-input'
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
import { collectorById, collectors, fullName, users } from '@/lib/mock-data'

export default async function AdminUsersPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('admin.users')
  const tc = await getTranslations('common')
  const tRoles = await getTranslations('roles')

  const collectorOptions = collectors
    .filter((collector) => collector.active)
    .map((collector) => ({ id: collector.id, name: fullName(collector) }))

  return (
    <AppShell title={t('title')}>
      <PageHeader title={t('title')} description={t('description')} />
      <AdminTabs />

      <Card className="py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput placeholder={t('searchPlaceholder')} />
          <NewUserDialog collectors={collectorOptions} />
        </div>

        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t('table.user')}</TableHead>
                  <TableHead>{t('table.username')}</TableHead>
                  <TableHead>{t('table.role')}</TableHead>
                  <TableHead>{t('table.linkedCollector')}</TableHead>
                  <TableHead>{t('table.lastActive')}</TableHead>
                  <TableHead className="pr-4">{tc('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const collector = collectorById(user.collectorId)
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="pl-4">
                        <span className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </span>
                          <span className="font-medium">{fullName(user)}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {user.username}
                      </TableCell>
                      <TableCell>{tRoles(user.role)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {collector ? fullName(collector) : tc('none')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.lastActiveLabel}
                      </TableCell>
                      <TableCell className="pr-4">
                        <StatusBadge status={user.active ? 'active' : 'inactive'} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
