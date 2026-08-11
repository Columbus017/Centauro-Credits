import { LockKeyhole } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { AuthNotice } from '@/components/auth-notice'

/**
 * Rendered with a real 401 when `requireUser()` finds no session. In practice
 * `proxy.ts` redirects to the login screen first; this is what answers a
 * request that reached a page without passing through it.
 */
export default async function Unauthorized() {
  const t = await getTranslations('auth.unauthorized')

  return (
    <AuthNotice
      icon={<LockKeyhole className="size-6" />}
      title={t('title')}
      description={t('description')}
      actionLabel={t('action')}
      actionHref="/login"
    />
  )
}
