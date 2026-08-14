'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

// The `dark` class is put on <html> by the inline script in the root layout
// before React hydrates, so the DOM — not React — owns the theme. Read it as
// external state instead of mirroring it into a useState.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => observer.disconnect()
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark')
}

export function ThemeToggle() {
  const t = useTranslations('shell')
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false)

  function toggle() {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('centauro-theme', next ? 'dark' : 'light')
    } catch {}
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t('toggleTheme')}>
      {/* The icon is the destination, not the current state: in the dark it
          offers the sun. A moon shown while the screen is already dark reads
          as "you are here" on a control whose only job is to go elsewhere. */}
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
