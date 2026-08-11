import { handlers } from '@/lib/auth'

// Auth.js's own endpoints (session, csrf, callback, signout). Outside
// `app/[locale]/` on purpose — they are machine routes with nothing to
// translate, and `proxy.ts` excludes `/api` from locale rewriting.
export const { GET, POST } = handlers
