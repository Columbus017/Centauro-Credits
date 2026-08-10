import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

type ButtonProps = React.ComponentProps<typeof Button>

/**
 * A button that navigates. Base UI's Button assumes it renders a native
 * `<button>` and warns when handed an anchor, so `nativeButton={false}` has to
 * travel with every link-shaped button — centralising it here keeps that from
 * being forgotten at each call site.
 */
export function LinkButton({
  href,
  children,
  ...props
}: Omit<ButtonProps, 'render' | 'nativeButton'> & {
  href: React.ComponentProps<typeof Link>['href']
}) {
  return (
    <Button {...props} nativeButton={false} render={<Link href={href} />}>
      {children}
    </Button>
  )
}
