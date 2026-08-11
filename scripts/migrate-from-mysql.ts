/**
 * One-shot ETL: legacy MySQL 5.7 → PostgreSQL.
 *
 *   pnpm db:migrate-legacy [--dry-run] [--force] [--allow-orphans]
 *                          [--merge-duplicate-closes]
 *
 * Run it against a **restored copy of a `mysqldump`**, never the live
 * database. `docker-compose.dev.yml` has an `etl` profile with a scratch
 * MySQL 5.7 for exactly this:
 *
 *   docker compose -f docker-compose.dev.yml --profile etl up -d mysql
 *   docker exec -i centauro-mysql-etl mysql -uroot -petl localdb < dump.sql
 *
 * Two principles run through the whole script:
 *
 *   1. **Primary keys are preserved.** Card numbers, printed receipts and
 *      years of paper reference the original ids.
 *   2. **Nothing is silently corrected.** Every recomputed running balance is
 *      compared against the stored one; mismatches are pre-existing corruption
 *      in float columns and are reported, never overwritten. The same goes for
 *      orphaned foreign keys and duplicate daily closes — each aborts the run
 *      with a report unless you explicitly opt in to a documented compromise.
 */

import 'dotenv/config'
import mysql from 'mysql2/promise'

import { isoDate, resetIdSequences } from '@/lib/db-utils'
import {
  DEFAULT_INTEREST_RATE,
  payoffState,
  payoffTotalCents,
  recalculateBalances,
  toCents,
} from '@/lib/ledger'
import { createPrismaClient } from '@/lib/prisma-client'
import type { PrismaClient } from '@/lib/generated/prisma/client'

// ------------------------------------------------------------------- legacy

// Shapes as MySQL returns them. `dateStrings: true` on the connection keeps
// DATE columns as `YYYY-MM-DD` instead of JS Dates in the local time zone,
// which would shift every date a day backwards in Guatemala.
type OldCommerce = { idCommerce: number; name: string | null }
type OldCollector = {
  idCollector: number
  firstName: string | null
  lastName: string | null
  address: string | null
  mobile: string | null
  DPI: string | null
  birthDate: string | null
  state: number | null
}
type OldRoute = {
  idRoute: number
  codeRoute: string | null
  routeName: string | null
  details: string | null
  _idCollector: number | null
  state: number | null
}
type OldCustomer = {
  idCustomer: number
  _idCommerce: number | null
  _idRoute: number | null
  DPI: string | null
  firstName: string | null
  lastName: string | null
  address: string | null
  mobile: string | null
  mobile2: string | null
  state: number | null
}
type OldCredit = {
  idCredit: number
  _idCustomer: number | null
  _idCollector: number | null
  code: string | null
  dateStart: string | null
  total: number | null
  cancel: number | null
  record: number | null
}
type OldBalance = {
  idBalance: number
  _idCredit: number | null
  date: string | null
  balpay: number | null
  amount: number | null
  balance: number | null
  state: number | null
}
type OldIncome = {
  idIncome: number
  _idCollector: number | null
  date: string | null
  incomes: number | null
  base: number | null
  exes: number | null
  credits: number | null
}
type OldUser = {
  idUser: number
  _idCollector: number | null
  firstName: string | null
  lastName: string | null
  userName: string | null
  passWord: string | null
  permissions: number | null
  state: number | null
}

type Legacy = {
  commerce: OldCommerce[]
  collector: OldCollector[]
  route: OldRoute[]
  customer: OldCustomer[]
  credit: OldCredit[]
  balance: OldBalance[]
  income: OldIncome[]
  user: OldUser[]
}

// -------------------------------------------------------------------- utils

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FORCE = args.has('--force')
const ALLOW_ORPHANS = args.has('--allow-orphans')
const MERGE_DUPLICATE_CLOSES = args.has('--merge-duplicate-closes')

/** Collected as we go and printed as one block at the end. */
const problems: string[] = []
function report(message: string) {
  problems.push(message)
}

/**
 * Conditions that stop a real run. A dry run records them and carries on, so
 * one command produces the full list of what needs deciding rather than only
 * whichever gate happens to trip first.
 */
const blockers: string[] = []
function block(summary: string) {
  blockers.push(summary)
}

/** `state = 1` is the legacy soft-delete flag; anything else is live. */
const isActive = (state: number | null) => state !== 1

/** The legacy app writes `0` where it means "no relation". */
function optionalId(value: number | null | undefined) {
  return value ? value : null
}

/** MySQL keeps `0000-00-00` for "no date"; there is no such Postgres date. */
function optionalDate(value: string | null | undefined) {
  if (!value || value.startsWith('0000')) return null
  return isoDate(value.slice(0, 10))
}

function requireDate(value: string | null | undefined, context: string) {
  const parsed = optionalDate(value)
  if (!parsed) throw new Error(`${context}: missing a date that cannot be defaulted`)
  return parsed
}

/** Floats in, fixed-point strings out — what a `Decimal` column wants. */
function money(value: number | null | undefined) {
  return ((value ?? 0)).toFixed(2)
}

const blankToNull = (value: string | null | undefined) =>
  value && value.trim() ? value.trim() : null

function text(value: string | null | undefined, fallback = '') {
  return value?.trim() ?? fallback
}

/**
 * Postgres allows at most 65535 bound parameters per statement, and Prisma
 * sends a `createMany` as a single INSERT. A `balance` table of any real age
 * blows straight through that, so every insert goes in batches.
 */
const BATCH_SIZE = 1_000

async function insertInBatches<T>(
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await insert(rows.slice(i, i + BATCH_SIZE))
  }
}

// -------------------------------------------------------------------- read

async function readLegacy(url: string): Promise<Legacy> {
  const conn = await mysql.createConnection({ uri: url, dateStrings: true })
  try {
    const table = async <T>(name: string, orderBy: string) => {
      const [rows] = await conn.query(`SELECT * FROM \`${name}\` ORDER BY ${orderBy}`)
      return rows as T[]
    }

    return {
      commerce: await table<OldCommerce>('commerce', 'idCommerce'),
      collector: await table<OldCollector>('collector', 'idCollector'),
      route: await table<OldRoute>('route', 'idRoute'),
      customer: await table<OldCustomer>('customer', 'idCustomer'),
      credit: await table<OldCredit>('credit', 'idCredit'),
      // Ledger order is `idBalance`, not `date` — the legacy app posts and
      // re-derives in insertion order, and back-dated payments do happen.
      balance: await table<OldBalance>('balance', 'idBalance'),
      income: await table<OldIncome>('income', 'idIncome'),
      user: await table<OldUser>('user', 'idUser'),
    }
  } finally {
    await conn.end()
  }
}

// ---------------------------------------------------------------- validate

/**
 * Everything that must be decided before a single row is written: dangling
 * foreign keys the old schema never enforced, and duplicate daily closes the
 * new unique constraint rejects.
 */
function validate(legacy: Legacy) {
  const commerceIds = new Set(legacy.commerce.map((r) => r.idCommerce))
  const collectorIds = new Set(legacy.collector.map((r) => r.idCollector))
  const routeIds = new Set(legacy.route.map((r) => r.idRoute))
  const customerIds = new Set(legacy.customer.map((r) => r.idCustomer))
  const creditIds = new Set(legacy.credit.map((r) => r.idCredit))

  /** Orphans on a nullable column: the reference is dropped, data survives. */
  const orphanedOptional: string[] = []
  /** Orphans on a required column: the row itself cannot be migrated. */
  const orphanedRequired: string[] = []

  for (const route of legacy.route) {
    const id = optionalId(route._idCollector)
    if (id && !collectorIds.has(id)) {
      orphanedOptional.push(`route ${route.idRoute} → collector ${id}`)
    }
  }
  for (const customer of legacy.customer) {
    const commerceId = optionalId(customer._idCommerce)
    if (commerceId && !commerceIds.has(commerceId)) {
      orphanedOptional.push(`customer ${customer.idCustomer} → commerce ${commerceId}`)
    }
    const routeId = optionalId(customer._idRoute)
    if (routeId && !routeIds.has(routeId)) {
      orphanedOptional.push(`customer ${customer.idCustomer} → route ${routeId}`)
    }
  }
  for (const user of legacy.user) {
    const id = optionalId(user._idCollector)
    if (id && !collectorIds.has(id)) {
      orphanedOptional.push(`user ${user.idUser} → collector ${id}`)
    }
  }
  for (const credit of legacy.credit) {
    if (!customerIds.has(credit._idCustomer ?? -1)) {
      orphanedRequired.push(`credit ${credit.idCredit} → customer ${credit._idCustomer}`)
    }
    if (!collectorIds.has(credit._idCollector ?? -1)) {
      orphanedRequired.push(`credit ${credit.idCredit} → collector ${credit._idCollector}`)
    }
  }
  for (const entry of legacy.balance) {
    if (!creditIds.has(entry._idCredit ?? -1)) {
      orphanedRequired.push(`balance ${entry.idBalance} → credit ${entry._idCredit}`)
    }
  }
  for (const income of legacy.income) {
    if (!collectorIds.has(income._idCollector ?? -1)) {
      orphanedRequired.push(`income ${income.idIncome} → collector ${income._idCollector}`)
    }
  }

  // The old `income` table has no unique key, so the same collector can be
  // closed out twice for one day — double-counting them on every dashboard.
  const closesByKey = new Map<string, OldIncome[]>()
  for (const income of legacy.income) {
    const key = `${income._idCollector}|${(income.date ?? '').slice(0, 10)}`
    closesByKey.set(key, [...(closesByKey.get(key) ?? []), income])
  }
  const duplicateCloses = [...closesByKey.values()].filter((rows) => rows.length > 1)

  // `user.userName` carries no unique key in the old schema, but a login has
  // to be unambiguous — Auth.js looks a user up by exactly this column.
  const usersByName = new Map<string, OldUser[]>()
  for (const user of legacy.user) {
    const key = text(user.userName).toLowerCase()
    usersByName.set(key, [...(usersByName.get(key) ?? []), user])
  }
  const duplicateUsernames = [...usersByName.values()].filter((rows) => rows.length > 1)

  return { orphanedOptional, orphanedRequired, duplicateCloses, duplicateUsernames }
}

/**
 * The subset of legacy rows that can land in a schema with real foreign keys.
 *
 * A credit whose customer or collector no longer exists has nowhere to hang,
 * and its ledger rows have to go with it — otherwise the insert violates the
 * constraint the old schema never had. `write` and `verify` both read this, so
 * the reconciliation counts cannot drift from what was actually written.
 */
function selectMigratable(legacy: Legacy, keptCloses: OldIncome[]) {
  const collectorIds = new Set(legacy.collector.map((r) => r.idCollector))
  const customerIds = new Set(legacy.customer.map((r) => r.idCustomer))

  const credits = legacy.credit.filter(
    (row) => customerIds.has(row._idCustomer ?? -1) && collectorIds.has(row._idCollector ?? -1),
  )
  const creditIds = new Set(credits.map((row) => row.idCredit))

  return {
    credits,
    creditIds,
    balance: legacy.balance.filter((row) => creditIds.has(row._idCredit ?? -1)),
    income: keptCloses.filter((row) => collectorIds.has(row._idCollector ?? -1)),
  }
}

type Migratable = ReturnType<typeof selectMigratable>

// ------------------------------------------------------------ ledger checks

/**
 * Recomputes every credit's ledger and compares it with what MySQL stored.
 *
 * The legacy columns are floats and four separate PHP files maintain them, so
 * disagreement is expected on old rows. Findings are reported; the migrated
 * data keeps the **recomputed** value, since a running balance that does not
 * follow from its own entries is not worth preserving.
 */
function auditLedger(legacy: Legacy) {
  const entriesByCredit = new Map<number, OldBalance[]>()
  for (const entry of legacy.balance) {
    const id = entry._idCredit ?? -1
    entriesByCredit.set(id, [...(entriesByCredit.get(id) ?? []), entry])
  }

  const recomputed = new Map<number, number>() // idBalance → running balance in cents
  let balanceMismatches = 0
  let originationMismatches = 0
  let flagMismatches = 0
  let creditsWithoutLedger = 0

  for (const credit of legacy.credit) {
    const rows = entriesByCredit.get(credit.idCredit) ?? []
    if (rows.length === 0) {
      creditsWithoutLedger += 1
      report(`credit ${credit.idCredit}: no ledger rows at all — nothing to reconcile`)
      continue
    }

    const expectedOrigination = payoffTotalCents(credit.total ?? 0, DEFAULT_INTEREST_RATE)
    const origination = rows[0]
    if (origination.balpay === 0 && toCents(origination.amount ?? 0) !== expectedOrigination) {
      originationMismatches += 1
      report(
        `credit ${credit.idCredit}: origination is ${money(origination.amount)} but ` +
          `principal ${money(credit.total)} × 1.15 = ${(expectedOrigination / 100).toFixed(2)}`,
      )
    }

    const ledger = rows.map((row) => ({
      id: row.idBalance,
      kind: (row.balpay === 1 ? 'payment' : 'origination') as 'payment' | 'origination',
      amountCents: toCents(row.amount ?? 0),
      voided: row.state === 1,
      entryDate: (row.date ?? '').slice(0, 10),
    }))

    for (const row of recalculateBalances(ledger)) {
      recomputed.set(row.id, row.runningBalanceCents)

      // Voided rows keep a stale balance in the legacy data by design — the
      // void path never rewrites the row it just annulled.
      if (row.voided) continue

      const stored = toCents(rows.find((r) => r.idBalance === row.id)!.balance ?? 0)
      if (stored !== row.runningBalanceCents) {
        balanceMismatches += 1
        report(
          `credit ${credit.idCredit}, balance ${row.id}: stored ${(stored / 100).toFixed(2)}, ` +
            `recomputed ${(row.runningBalanceCents / 100).toFixed(2)}`,
        )
      }
    }

    // The `cancel` / `record` flags are maintained by hand in four places, so
    // check them against the entries too.
    const startDate = (credit.dateStart ?? '').slice(0, 10)
    if (startDate) {
      const state = payoffState(startDate, ledger)
      if (state.paidOff !== (credit.cancel === 1)) {
        flagMismatches += 1
        report(
          `credit ${credit.idCredit}: cancel = ${credit.cancel} but the ledger says ` +
            `${state.paidOff ? 'paid off' : 'still owing'}`,
        )
      }
      if (state.paidOff && state.badRecord !== (credit.record === 1)) {
        flagMismatches += 1
        report(
          `credit ${credit.idCredit}: record = ${credit.record} but payoff took ` +
            `${state.badRecord ? 'more' : 'fewer'} than 30 days`,
        )
      }
    }
  }

  return {
    recomputed,
    balanceMismatches,
    originationMismatches,
    flagMismatches,
    creditsWithoutLedger,
  }
}

// -------------------------------------------------------------------- write

async function write(
  prisma: PrismaClient,
  legacy: Legacy,
  migratable: Migratable,
  recomputed: Map<number, number>,
  voidedAt: Date,
) {
  const collectorIds = new Set(legacy.collector.map((r) => r.idCollector))
  const commerceIds = new Set(legacy.commerce.map((r) => r.idCommerce))
  const routeIds = new Set(legacy.route.map((r) => r.idRoute))

  /** Drops a dangling optional reference rather than failing the whole run. */
  const linkOr = (id: number | null, known: Set<number>) => {
    const value = optionalId(id)
    return value && known.has(value) ? value : null
  }

  await insertInBatches(
    legacy.commerce.map((row) => ({
      id: row.idCommerce,
      name: text(row.name, '—').slice(0, 120),
      // The legacy `commerce` table has no state column; everything is live.
      active: true,
    })),
    (data) => prisma.commerce.createMany({ data }),
  )

  await insertInBatches(
    legacy.collector.map((row) => ({
      id: row.idCollector,
      firstName: text(row.firstName).slice(0, 80),
      lastName: text(row.lastName).slice(0, 80),
      dpi: blankToNull(row.DPI)?.slice(0, 20) ?? null,
      mobile: blankToNull(row.mobile)?.slice(0, 20) ?? null,
      address: blankToNull(row.address),
      birthDate: optionalDate(row.birthDate),
      active: isActive(row.state),
    })),
    (data) => prisma.collector.createMany({ data }),
  )

  await insertInBatches(
    legacy.route.map((row) => ({
      id: row.idRoute,
      code: text(row.codeRoute).slice(0, 20),
      name: text(row.routeName).slice(0, 120),
      details: blankToNull(row.details),
      collectorId: linkOr(row._idCollector, collectorIds),
      active: isActive(row.state),
    })),
    (data) => prisma.route.createMany({ data }),
  )

  await insertInBatches(
    legacy.customer.map((row) => ({
      id: row.idCustomer,
      firstName: text(row.firstName).slice(0, 80),
      lastName: text(row.lastName).slice(0, 80),
      dpi: blankToNull(row.DPI)?.slice(0, 20) ?? null,
      address: blankToNull(row.address),
      mobile: blankToNull(row.mobile)?.slice(0, 20) ?? null,
      mobile2: blankToNull(row.mobile2)?.slice(0, 20) ?? null,
      commerceId: linkOr(row._idCommerce, commerceIds),
      routeId: linkOr(row._idRoute, routeIds),
      active: isActive(row.state),
    })),
    (data) => prisma.customer.createMany({ data }),
  )

  // A cancelled credit needs the date it was cancelled; the old schema stored
  // only the flag, so take the date of its last live ledger row.
  const lastLiveEntryDate = new Map<number, string>()
  for (const entry of legacy.balance) {
    if (entry.state === 1) continue
    const creditId = entry._idCredit ?? -1
    const date = (entry.date ?? '').slice(0, 10)
    if (date) lastLiveEntryDate.set(creditId, date)
  }

  await insertInBatches(
    migratable.credits.map((row) => {
        const cancelledOn = lastLiveEntryDate.get(row.idCredit)
        return {
          id: row.idCredit,
          customerId: row._idCustomer!,
          collectorId: row._idCollector!,
          code: text(row.code).slice(0, 40),
          startDate: requireDate(row.dateStart, `credit ${row.idCredit}`),
          principal: money(row.total),
          interestRate: DEFAULT_INTEREST_RATE.toFixed(4),
          cancelledAt: row.cancel === 1 && cancelledOn ? isoDate(cancelledOn) : null,
          badRecord: row.record === 1,
      }
    }),
    (data) => prisma.credit.createMany({ data }),
  )

  await insertInBatches(
    migratable.balance.map((row) => ({
        id: row.idBalance,
        creditId: row._idCredit!,
        kind: (row.balpay === 1 ? 'payment' : 'origination') as 'payment' | 'origination',
        entryDate: requireDate(row.date, `balance ${row.idBalance}`),
        amount: money(row.amount),
        // The recomputed value, not the stored one: a running balance that
        // does not follow from its own entries is not worth carrying over.
        // Every difference is listed in the report above.
        runningBalance: ((recomputed.get(row.idBalance) ?? 0) / 100).toFixed(2),
        // The legacy schema recorded no void timestamp, so migrated voids all
        // carry the moment of the migration itself.
        voidedAt: row.state === 1 ? voidedAt : null,
      })),
    (data) => prisma.ledgerEntry.createMany({ data }),
  )

  await insertInBatches(
    migratable.income.map((row) => ({
      id: row.idIncome,
      collectorId: row._idCollector!,
      closeDate: requireDate(row.date, `income ${row.idIncome}`),
      collected: money(row.incomes),
      base: money(row.base),
      surplus: money(row.exes),
      disbursed: money(row.credits),
    })),
    (data) => prisma.dailyClose.createMany({ data }),
  )

  await insertInBatches(
    legacy.user.map((row) => ({
      id: row.idUser,
      firstName: text(row.firstName).slice(0, 80),
      lastName: text(row.lastName).slice(0, 80),
      username: text(row.userName).slice(0, 60),
      // PHP's `password_hash(..., PASSWORD_BCRYPT)` output, carried across
      // verbatim. bcrypt hashes are portable — nobody resets a password.
      passwordHash: text(row.passWord),
      // `permissions`: 0 drew the admin sidebar, 1 the collector one.
      role: (row.permissions === 1 ? 'collector' : 'admin') as 'collector' | 'admin',
      collectorId: linkOr(row._idCollector, collectorIds),
      active: isActive(row.state),
    })),
    (data) => prisma.user.createMany({ data }),
  )

  await resetIdSequences(prisma)
}

// ------------------------------------------------------------------- verify

/** Post-migration reconciliation: counts and money must match the source. */
async function verify(prisma: PrismaClient, legacy: Legacy, migratable: Migratable) {
  const expected: Record<string, number> = {
    commerce: legacy.commerce.length,
    collectors: legacy.collector.length,
    routes: legacy.route.length,
    customers: legacy.customer.length,
    credits: migratable.credits.length,
    ledger_entries: migratable.balance.length,
    daily_closes: migratable.income.length,
    users: legacy.user.length,
  }

  const actual: Record<string, number> = {
    commerce: await prisma.commerce.count(),
    collectors: await prisma.collector.count(),
    routes: await prisma.route.count(),
    customers: await prisma.customer.count(),
    credits: await prisma.credit.count(),
    ledger_entries: await prisma.ledgerEntry.count(),
    daily_closes: await prisma.dailyClose.count(),
    users: await prisma.user.count(),
  }

  console.log('\nRow counts (legacy → postgres):')
  let countsMatch = true
  for (const [table, count] of Object.entries(expected)) {
    const got = actual[table]
    const ok = got === count
    countsMatch &&= ok
    console.log(`  ${ok ? '✓' : '✗'} ${table.padEnd(15)} ${count} → ${got}`)
  }

  const legacyPrincipal = migratable.credits.reduce(
    (sum, row) => sum + toCents(money(row.total)),
    0,
  )
  const aggregate = await prisma.credit.aggregate({ _sum: { principal: true } })
  const migratedPrincipal = toCents(aggregate._sum.principal?.toString() ?? '0')
  const principalMatches = legacyPrincipal === migratedPrincipal

  console.log(
    `\n  ${principalMatches ? '✓' : '✗'} SUM(principal)  ` +
      `${(legacyPrincipal / 100).toFixed(2)} → ${(migratedPrincipal / 100).toFixed(2)}`,
  )

  return countsMatch && principalMatches
}

// --------------------------------------------------------------------- main

async function main() {
  const mysqlUrl = process.env.MYSQL_URL
  if (!mysqlUrl) {
    throw new Error('MYSQL_URL is not set — see .env.example')
  }

  console.log(`Reading legacy data${DRY_RUN ? ' (dry run)' : ''}…`)
  const legacy = await readLegacy(mysqlUrl)
  for (const [table, rows] of Object.entries(legacy)) {
    console.log(`  ${table.padEnd(10)} ${rows.length} rows`)
  }

  const { orphanedOptional, orphanedRequired, duplicateCloses, duplicateUsernames } =
    validate(legacy)

  if (duplicateUsernames.length) {
    console.error(
      `\n${duplicateUsernames.length} username(s) appear more than once. ` +
        'Logins must be unambiguous, and there is no safe way to guess which row is real:',
    )
    for (const group of duplicateUsernames) {
      console.error(
        `  "${text(group[0].userName)}": user ${group.map((r) => r.idUser).join(', ')}`,
      )
    }
    console.error('\nRename or deactivate the duplicates in the dump copy, then re-run.')
    block(`${duplicateUsernames.length} duplicate username(s)`)
  }

  if (orphanedOptional.length) {
    console.log(`\n${orphanedOptional.length} dangling optional reference(s); each becomes NULL:`)
    for (const line of orphanedOptional.slice(0, 20)) console.log(`  ${line}`)
    if (orphanedOptional.length > 20) console.log(`  … ${orphanedOptional.length - 20} more`)
  }

  if (orphanedRequired.length && !ALLOW_ORPHANS) {
    console.error(
      `\n${orphanedRequired.length} row(s) point at a parent that does not exist. ` +
        'These cannot be migrated — the new schema has real foreign keys:',
    )
    for (const line of orphanedRequired.slice(0, 40)) console.error(`  ${line}`)
    if (orphanedRequired.length > 40) console.error(`  … ${orphanedRequired.length - 40} more`)
    console.error(
      '\nFix them in the dump copy, or re-run with --allow-orphans to skip those rows.',
    )
    block(`${orphanedRequired.length} orphaned row(s)`)
  }
  if (orphanedRequired.length && ALLOW_ORPHANS) {
    report(`${orphanedRequired.length} orphaned row(s) skipped (--allow-orphans)`)
  }

  let keptCloses = legacy.income
  if (duplicateCloses.length) {
    if (!MERGE_DUPLICATE_CLOSES) {
      console.error(
        `\n${duplicateCloses.length} collector-day(s) have more than one daily close. ` +
          'The new schema forbids that (the old one double-counted them):',
      )
      for (const group of duplicateCloses.slice(0, 20)) {
        const ids = group.map((row) => row.idIncome).join(', ')
        console.error(
          `  collector ${group[0]._idCollector} on ${(group[0].date ?? '').slice(0, 10)}: income ${ids}`,
        )
      }
      console.error(
        '\nDecide which row is real and remove the others from the dump copy, or re-run ' +
          'with --merge-duplicate-closes to keep the highest id of each group.',
      )
      block(`${duplicateCloses.length} duplicate daily close(s)`)
    } else {
      const dropped = new Set<number>()
      for (const group of duplicateCloses) {
        const sorted = [...group].sort((a, b) => b.idIncome - a.idIncome)
        for (const row of sorted.slice(1)) dropped.add(row.idIncome)
        report(
          `duplicate close for collector ${group[0]._idCollector} on ` +
            `${(group[0].date ?? '').slice(0, 10)}: kept income ${sorted[0].idIncome}, ` +
            `dropped ${sorted.slice(1).map((r) => r.idIncome).join(', ')}`,
        )
      }
      keptCloses = keptCloses.filter((row) => !dropped.has(row.idIncome))
    }
  }

  const migratable = selectMigratable(legacy, keptCloses)

  console.log('\nAuditing the ledger…')
  const audit = auditLedger(legacy)
  console.log(
    `  ${audit.balanceMismatches} running-balance mismatch(es), ` +
      `${audit.originationMismatches} origination mismatch(es), ` +
      `${audit.flagMismatches} cancel/record flag mismatch(es), ` +
      `${audit.creditsWithoutLedger} credit(s) with no ledger`,
  )

  if (DRY_RUN) {
    printProblems()
    console.log(
      blockers.length
        ? `\nDry run — nothing was written. ${blockers.length} condition(s) would stop a real run: ${blockers.join('; ')}.`
        : '\nDry run — nothing was written, and nothing would block a real run.',
    )
    return
  }

  if (blockers.length) {
    console.error(`\nStopping: ${blockers.join('; ')}. Nothing was written.`)
    process.exit(1)
  }

  const prisma = createPrismaClient()
  try {
    const existing = await prisma.credit.count()
    if (existing > 0 && !FORCE) {
      console.error(
        `\nThe target database already holds ${existing} credit(s). ` +
          'Migrate into an empty database, or pass --force to wipe and re-import.',
      )
      process.exit(1)
    }

    if (existing > 0) {
      console.log('\nWiping the target database (--force)…')
      await prisma.ledgerEntry.deleteMany()
      await prisma.credit.deleteMany()
      await prisma.dailyClose.deleteMany()
      await prisma.user.deleteMany()
      await prisma.customer.deleteMany()
      await prisma.route.deleteMany()
      await prisma.collector.deleteMany()
      await prisma.commerce.deleteMany()
    }

    console.log('\nWriting to Postgres…')
    const voidedAt = new Date()
    await prisma.$transaction(
      async (tx) => {
        await write(tx as unknown as PrismaClient, legacy, migratable, audit.recomputed, voidedAt)
      },
      // Prisma's default interactive-transaction budget is five seconds; a
      // decade of ledger rows takes longer than that, and a partial import is
      // worse than a slow one.
      { maxWait: 30_000, timeout: 30 * 60_000 },
    )

    const reconciled = await verify(prisma, legacy, migratable)
    printProblems()
    console.log(
      reconciled
        ? '\nMigration complete and reconciled.'
        : '\nMigration complete but the totals above do not reconcile — investigate before using this database.',
    )
    if (!reconciled) process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

function printProblems() {
  if (!problems.length) {
    console.log('\nNo data problems found.')
    return
  }
  console.log(`\n${problems.length} finding(s) — reported, not corrected:`)
  for (const line of problems.slice(0, 100)) console.log(`  ${line}`)
  if (problems.length > 100) console.log(`  … ${problems.length - 100} more`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
