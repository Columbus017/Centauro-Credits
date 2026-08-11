import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

import { authConfig } from '@/lib/auth.config'
import { db } from '@/lib/db'

/**
 * A valid bcrypt hash of a string nobody knows.
 *
 * An unknown username still gets a full `bcrypt.compare`, so a wrong username
 * and a wrong password cost the same ~100 ms. Without it the response time
 * enumerates who has an account — `BLL/logueo.php` returns immediately when
 * the `SELECT` finds nothing.
 */
const NO_SUCH_USER_HASH =
  '$2b$10$XQgb.GTG6hrmFnTzxA0Fo.8hrfezPRqxXiPwdOQv2fm69JmYyasAy'

const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'username', type: 'text' },
        password: { label: 'password', type: 'password' },
      },

      /**
       * Ports `BLL/logueo.php`: look the username up, `password_verify` the
       * password, and refuse the login unless the account is active. bcrypt
       * hashes are portable, so the `$2y$` strings written by PHP verify here
       * unchanged — migrated users keep their passwords.
       *
       * Returning `null` is the only failure signal, deliberately: an unknown
       * user, a wrong password and a deactivated account are indistinguishable
       * from outside, exactly as in the legacy app.
       */
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const { username, password } = parsed.data

        const user = await db.user.findUnique({
          where: { username },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            passwordHash: true,
            role: true,
            collectorId: true,
            active: true,
          },
        })

        const matches = await bcrypt.compare(
          password,
          user?.passwordHash ?? NO_SUCH_USER_HASH,
        )
        if (!user || !matches || !user.active) return null

        // The column exists so the admin screen's "última actividad" can show
        // something true; the legacy app tracked nothing.
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: String(user.id),
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          collectorId: user.collectorId,
        }
      },
    }),
  ],
})
