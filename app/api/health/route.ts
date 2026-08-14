import { db } from '@/lib/db'

/**
 * The container's liveness/readiness probe, replacing `health.php`.
 *
 * Deliberately public: it has to answer before anyone can sign in, and it is
 * what `docker-compose.yml` polls and what Dokploy watches. It is also the one
 * route in the app that says anything at all without a session, so it says as
 * little as possible.
 *
 * **The legacy endpoint published its own configuration.** `health.php`
 * returned `DB_HOST`, `DB_NAME`, `DB_USER`, the PHP version and the Apache
 * banner to anyone who asked, unauthenticated — the database user and host of
 * a production system, plus the exact server build to look up. None of that is
 * here: the answer is whether the app can reach its database, and nothing else.
 *
 * `proxy.ts` excludes `/api`, so no locale rewriting and no session check runs
 * in front of this handler — which is the intent, not an oversight.
 */

// A probe reports the state of *this* moment. Without this the handler is a
// static GET with no dynamic API in it, and Next would answer every probe with
// a value computed at build time, when there was no database to reach.
export const dynamic = 'force-dynamic'

/** How long the database is given to answer before the probe calls it down. */
const DB_TIMEOUT_MS = 3_000

export async function GET() {
  const startedAt = Date.now()

  const database = await checkDatabase()
  const healthy = database === 'up'

  return Response.json(
    {
      status: healthy ? 'ok' : 'degraded',
      database,
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      // 503 rather than a 200 carrying bad news: the compose healthcheck and
      // any reverse proxy in front decide on the status code, not the body.
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

async function checkDatabase(): Promise<'up' | 'down'> {
  // A probe that hangs is worse than one that fails — the orchestrator waits
  // on it instead of restarting the container.
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    await Promise.race([
      // The cheapest possible round trip: it proves the pool can hand out a
      // connection and Postgres is answering, without touching a table.
      db.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer in ${DB_TIMEOUT_MS}ms`)), DB_TIMEOUT_MS)
      }),
    ])
    return 'up'
  } catch (error) {
    // The reason goes to the container log, where an operator can read it —
    // never into an anonymous response.
    console.error('[health] database unreachable:', error)
    return 'down'
  } finally {
    clearTimeout(timer)
  }
}
