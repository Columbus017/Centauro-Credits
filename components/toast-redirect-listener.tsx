'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { toastSuccess } from '@/components/ui/toast'
import { usePathname, useRouter } from '@/i18n/navigation'

/**
 * A one-shot `?toast=<key>` survives a redirect out of a Server Action —
 * `lib/actions/*` appends it to the target instead of returning state, since
 * a redirecting action has nothing left to return it to. This fires the toast
 * once and strips the param so a reload or Back can't replay it.
 */
export function ToastRedirectListener() {
  const t = useTranslations('toast')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const key = searchParams.get('toast')
  const paramsString = searchParams.toString()

  // Guards against Strict Mode's dev-only double-invoke of a mounting
  // effect: without it, landing directly on a `?toast=` URL fires twice.
  const firedKey = useRef<string | null>(null)

  useEffect(() => {
    if (!key || firedKey.current === key) return
    firedKey.current = key

    toastSuccess(t(key))

    const next = new URLSearchParams(paramsString)
    next.delete('toast')
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [key, paramsString, pathname, router, t])

  return null
}
