'use client'

import { useLayoutEffect } from 'react'

export const THEME_STORAGE_KEY = 'centauro-theme'

/**
 * The rule, in one place: an explicit choice wins, otherwise follow the OS.
 *
 * Must stay free of closure references — `ThemeScript` serialises it with
 * `toString()`, and the string runs in a document that has none of this
 * module's scope.
 */
function applyStoredTheme() {
  try {
    const stored = localStorage.getItem('centauro-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle(
      'dark',
      stored === 'dark' || (!stored && prefersDark),
    )
  } catch {
    // Private browsing can throw on localStorage; light is a fine fallback.
  }
}

/**
 * Applies the theme before first paint, so dark mode does not flash white.
 * Belongs in the document Next.js renders from `app/[locale]/layout.tsx`.
 */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: `(${applyStoredTheme.toString()})()` }}
    />
  )
}

/**
 * The same rule for documents that never run the script above.
 *
 * `forbidden()` and `unauthorized()` are served through Next's own error shell
 * — `<html id="__next_error__">`, not the locale layout — and React does not
 * execute a `dangerouslySetInnerHTML` script when it renders one on the client.
 * Without this the 403 and 401 screens are stuck in light mode. It runs after
 * hydration rather than before paint, which on a page nobody navigates to
 * deliberately is a fair trade.
 */
export function ThemeSync() {
  useLayoutEffect(applyStoredTheme, [])
  return null
}
