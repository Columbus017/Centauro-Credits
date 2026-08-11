import { ShieldAlert } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { AuthNotice } from '@/components/auth-notice'
import { getSessionUser } from '@/lib/session'
import { roleHome } from '@/lib/roles'

/**
 * Rendered with a real 403 whenever `forbidden()` is called — by
 * `requireAdmin()` / `requireCollector()`, or by the `/forbidden` route
 * `proxy.ts` rewrites a denied request to.
 */
export default async function Forbidden() {
  const t = await getTranslations('auth.forbidden')
  const user = await getSessionUser()

  return (
    <AuthNotice
      icon={<ShieldAlert className="size-6" />}
      title={t('title')}
      description={t('description')}
      actionLabel={t('action')}
      actionHref={user ? roleHome(user.role) : '/login'}
    />
  )
}
