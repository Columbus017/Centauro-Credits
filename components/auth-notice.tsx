import { LinkButton } from '@/components/link-button'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * The full-page notice behind `forbidden.tsx` and `unauthorized.tsx`.
 *
 * Deliberately outside `AppShell`: the shell calls `requireUser()`, and a page
 * that exists because authorization failed must not re-run the check that
 * failed.
 */
export function AuthNotice({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel: string
  actionHref: string
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          {icon}
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-balance text-muted-foreground">{description}</p>
        <LinkButton variant="outline" className="mt-6" href={actionHref}>
          {actionLabel}
        </LinkButton>
      </div>
    </div>
  )
}
