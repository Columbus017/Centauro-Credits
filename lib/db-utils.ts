import type { PrismaClient } from '@/lib/generated/prisma/client'

/**
 * Builds the value for a `@db.Date` column from a `YYYY-MM-DD` string.
 *
 * Date columns carry no time zone, and Prisma reads the *UTC* date part of a
 * JS `Date`. Anchoring at UTC midnight is what keeps `2024-04-08` from being
 * stored as the 7th when the process runs in Guatemala.
 */
export function isoDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`)
}

/** Every table whose primary key the seed and the ETL insert explicitly. */
const TABLES = [
  'commerce',
  'collectors',
  'routes',
  'customers',
  'credits',
  'ledger_entries',
  'daily_closes',
  'users',
] as const

/**
 * Realigns each `id` sequence with the highest row present.
 *
 * Both the seed and the ETL insert explicit primary keys — the ETL must, since
 * printed receipts and card numbers reference the originals. Postgres does not
 * advance a sequence when a value is supplied, so without this the very next
 * insert collides on `id = 1`.
 */
export async function resetIdSequences(prisma: PrismaClient) {
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(
         pg_get_serial_sequence('"${table}"', 'id'),
         COALESCE((SELECT MAX(id) FROM "${table}"), 1),
         (SELECT MAX(id) FROM "${table}") IS NOT NULL
       )`,
    )
  }
}
