import type { DefaultSession } from 'next-auth'

import type { Role } from '@/lib/roles'

/**
 * The session payload the app relies on. Auth.js ships a generic
 * `{ name, email, image }` user; Centauro has no email or avatar and instead
 * needs the two fields every authorization decision reads.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      /** `users.collector_id` — null for admins. */
      collectorId: number | null
    } & DefaultSession['user']
  }

  /** What the Credentials provider's `authorize()` returns. */
  interface User {
    role: Role
    collectorId: number | null
  }
}

/**
 * The token claims read by `authConfig.callbacks`.
 *
 * Augmenting `next-auth/jwt` does nothing: that module only re-exports
 * `@auth/core/jwt`, so the `JWT` declared there is a new interface rather than
 * a merge. `@auth/core` is a devDependency for this declaration alone — it is
 * already installed as next-auth's own dependency, but pnpm does not hoist it
 * where TypeScript can resolve the specifier.
 */
declare module '@auth/core/jwt' {
  interface JWT {
    role: Role
    collectorId: number | null
  }
}
