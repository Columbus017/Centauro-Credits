import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '@/lib/generated/prisma/client'

/**
 * Builds a Prisma client against `DATABASE_URL`.
 *
 * Kept separate from `lib/db.ts` because that module is marked `server-only`,
 * which throws when imported from a plain Node process — and the seed and the
 * ETL are plain Node processes.
 */
export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env')
  }

  // Prisma 7 talks to Postgres through a driver adapter rather than bundling
  // its own native query engine.
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

/**
 * Builds a client on the *direct* connection, for the long-running jobs.
 *
 * A managed Postgres (Neon, Supabase) offers two URLs. The pooled one goes
 * through PgBouncer in transaction mode, which is what a serverless app needs
 * — every invocation opens its own connection — but which cannot hold a
 * session open across statements. The ETL is a single transaction over 61,868
 * rows with a 30-minute budget, and the seed and `prisma migrate` take
 * advisory locks; all three need the direct URL or they fail partway.
 *
 * `DIRECT_DATABASE_URL` is therefore set wherever those scripts run — a
 * laptop, a CI job — and left unset on the deployed app, which falls back to
 * the pooled `DATABASE_URL` it should be using anyway.
 */
export function createDirectPrismaClient() {
  return createPrismaClient(process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL)
}
