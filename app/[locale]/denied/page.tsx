import { forbidden } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

/**
 * The target `proxy.ts` rewrites a request to when the signed-in role may not
 * reach the URL. It exists only to call `forbidden()`, which is what sets the
 * 403 status and renders `app/[locale]/forbidden.tsx`.
 *
 * Nobody navigates here — a rewrite keeps the original address — but a direct
 * hit is harmless and answers the same way.
 */
export default async function DeniedPage({ params }: PageProps<'/[locale]/denied'>) {
  const { locale } = await params
  setRequestLocale(locale)

  forbidden()
}
