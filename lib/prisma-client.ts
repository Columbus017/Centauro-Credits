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
