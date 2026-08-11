import type { NextAuthConfig } from 'next-auth'

/**
 * The half of the Auth.js config that touches neither Prisma nor bcrypt.
 *
 * `proxy.ts` runs on every request and only ever reads the session cookie, so
 * it builds its own Auth.js instance from this module rather than importing
 * `lib/auth.ts` — which would drag the Prisma client into the proxy bundle for
 * a check that never queries the database.
 */
export const authConfig = {
  // In production Auth.js refuses to derive its own URL from the request host
  // unless told to — `UntrustedHost`, and every endpoint 500s. Centauro is
  // always served behind a reverse proxy it does not control the headers of
  // (Dokploy injects Traefik), so the host is trusted here rather than pinned
  // to an `AUTH_URL` that would have to change per environment.
  //
  // The proxy in front must therefore set `X-Forwarded-Host` itself and not
  // pass a client-supplied one through. Traefik does.
  trustHost: true,

  // No adapter and no session table: the session is the signed JWT cookie.
  // The legacy app kept a PHP session per request; a stateless token is the
  // equivalent that survives more than one app container.
  session: {
    strategy: 'jwt',
    // One working day. The legacy session lived until the browser closed,
    // which on a shared office machine is indefinitely.
    maxAge: 12 * 60 * 60,
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    // `user` is set only on the sign-in pass; afterwards the token is the
    // single source of truth, so the claims are copied across once.
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.collectorId = user.collectorId
      }
      return token
    },

    session({ session, token }) {
      session.user.id = token.sub ?? ''
      session.user.role = token.role
      session.user.collectorId = token.collectorId
      return session
    },
  },

  providers: [],
} satisfies NextAuthConfig
