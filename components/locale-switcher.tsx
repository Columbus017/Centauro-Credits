'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

export function LocaleSwitcher() {
  const t = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const labels: Record<Locale, string> = {
    es: t('spanish'),
    en: t('english'),
  }

  function onChange(next: unknown) {
    const nextLocale = next as Locale
    if (nextLocale === locale) return
    // `pathname` here is already locale-stripped, so re-navigating to it with a
    // different locale keeps the user on the same screen.
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
    })
  }

  // `items` is what makes the trigger show "Español" rather than the raw "es".
  const items = routing.locales.map((option) => ({
    value: option,
    label: labels[option],
  }))

  return (
    <Select
      items={items}
      value={locale}
      onValueChange={onChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
