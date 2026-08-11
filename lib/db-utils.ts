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

/**
 * Reads a `@db.Date` column back as the `YYYY-MM-DD` string the screens use.
 *
 * The UTC part, to undo `isoDate()` exactly. `toISOString().slice(0, 10)` on a
 * local-midnight date would give the previous day in Guatemala.
 */
export function fromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function fromDbDateOrNull(value: Date | null): string | null {
  return value ? fromDbDate(value) : null
}

/**
 * A `Decimal(12,2)` column as a plain number.
 *
 * Prisma hands `Decimal` back as an object; the screens and `lib/format.ts`
 * work in numbers. Two decimals of quetzales are far inside what a double
 * represents exactly, so the conversion is lossless — but arithmetic on the
 * result is not, which is why every calculation goes through `lib/ledger.ts`
 * in centavos instead.
 */
export function fromDbAmount(value: { toString(): string }): number {
  return Number(value.toString())
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
