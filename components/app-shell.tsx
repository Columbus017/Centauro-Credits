import { AppShellFrame } from '@/components/app-shell-frame'
import { requireUser } from '@/lib/session'

/**
 * Every screen behind the login renders this, so every screen is authenticated
 * by construction: `requireUser()` answers `unauthorized()` when there is no
 * session, whatever `proxy.ts` did or did not do first.
 *
 * It settles the identity only. A page that is not for every role still states
 * so itself — `requireAdmin()` or `requireCollector()` at the top — because the
 * shell has no way to know which page it is wrapping.
 */
export async function AppShell({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  const user = await requireUser()

  return (
    <AppShellFrame title={title} role={user.role} userName={user.name}>
      {children}
    </AppShellFrame>
  )
}
