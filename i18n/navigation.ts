import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

// Locale-aware replacements for `next/link` and `next/navigation`. Import these
// instead of the Next.js originals so links keep the active locale prefix.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
