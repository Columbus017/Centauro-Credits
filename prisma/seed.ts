/**
 * Loads `lib/mock-data.ts` into Postgres so the app has something to read
 * before the real MySQL dump arrives.
 *
 * This is development data, not the migration — that is
 * `scripts/migrate-from-mysql.ts`. Running it wipes every table first, so it
 * must never be pointed at a database holding migrated production rows.
 *
 *   pnpm db:seed
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'

import { isoDate, resetIdSequences } from '@/lib/db-utils'
import { recalculateBalances, toCents } from '@/lib/ledger'
import { createDirectPrismaClient } from '@/lib/prisma-client'
import {
  collectors,
  commerce,
  credits,
  customers,
  dailyCloses,
  ledgerEntries,
  routes,
  users,
} from '@/lib/mock-data'

/** Shared by every seeded login. Development only — see the console notice. */
const DEV_PASSWORD = 'centauro'

/**
 * The mock data derives its ledger inline. Re-deriving it through `lib/ledger`
 * proves the two agree before either reaches a screen — the ETL asserts the
 * same property against MySQL.
 */
function assertLedgerAgrees() {
  for (const credit of credits) {
    const rows = ledgerEntries
      .filter((entry) => entry.creditId === credit.id)
      .map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        amountCents: toCents(entry.amount),
        voided: entry.voided,
      }))

    for (const row of recalculateBalances(rows)) {
      const seeded = ledgerEntries.find((entry) => entry.id === row.id)!
      if (row.runningBalanceCents !== toCents(seeded.runningBalance)) {
        throw new Error(
          `Ledger drift on credit ${credit.id}, entry ${row.id}: ` +
            `mock-data says ${seeded.runningBalance}, lib/ledger says ${
              row.runningBalanceCents / 100
            }`,
        )
      }
    }
  }
}

async function main() {
  assertLedgerAgrees()

  const prisma = createDirectPrismaClient()

  try {
    // Child-first, so the foreign keys hold at every step.
    await prisma.ledgerEntry.deleteMany()
    await prisma.credit.deleteMany()
    await prisma.dailyClose.deleteMany()
    await prisma.user.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.route.deleteMany()
    await prisma.collector.deleteMany()
    await prisma.commerce.deleteMany()

    await prisma.commerce.createMany({
      data: commerce.map((row) => ({
        id: row.id,
        name: row.name,
        active: row.active,
      })),
    })

    await prisma.collector.createMany({
      data: collectors.map((row) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        dpi: row.dpi,
        mobile: row.mobile,
        address: row.address,
        birthDate: isoDate(row.birthDate),
        active: row.active,
      })),
    })

    await prisma.route.createMany({
      data: routes.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        details: row.details,
        collectorId: row.collectorId,
        active: row.active,
      })),
    })

    await prisma.customer.createMany({
      data: customers.map((row) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        dpi: row.dpi,
        address: row.address,
        mobile: row.mobile,
        // The old schema stored an empty string for "no second number".
        mobile2: row.mobile2 || null,
        commerceId: row.commerceId,
        routeId: row.routeId,
        active: row.active,
        createdAt: isoDate(row.createdAt),
      })),
    })

    await prisma.credit.createMany({
      data: credits.map((row) => ({
        id: row.id,
        customerId: row.customerId,
        collectorId: row.collectorId,
        code: row.code,
        startDate: isoDate(row.startDate),
        principal: row.principal,
        interestRate: row.interestRate,
        cancelledAt: row.cancelledAt ? isoDate(row.cancelledAt) : null,
        badRecord: row.badRecord,
      })),
    })

    await prisma.ledgerEntry.createMany({
      data: ledgerEntries.map((row) => ({
        id: row.id,
        creditId: row.creditId,
        kind: row.kind,
        entryDate: isoDate(row.entryDate),
        amount: row.amount,
        runningBalance: row.runningBalance,
        // The mock data records *that* a payment was voided, never when; the
        // seed dates it to the entry itself rather than inventing a timestamp.
        voidedAt: row.voided ? isoDate(row.entryDate) : null,
      })),
    })

    await prisma.dailyClose.createMany({
      data: dailyCloses.map((row) => ({
        id: row.id,
        collectorId: row.collectorId,
        closeDate: isoDate(row.closeDate),
        collected: row.collected,
        base: row.base,
        surplus: row.surplus,
        disbursed: row.disbursed,
      })),
    })

    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10)
    await prisma.user.createMany({
      data: users.map((row) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        username: row.username,
        passwordHash,
        role: row.role,
        collectorId: row.collectorId,
        active: row.active,
      })),
    })

    await resetIdSequences(prisma)

    console.log(
      [
        'Seeded:',
        `  ${commerce.length} commerce, ${collectors.length} collectors, ${routes.length} routes`,
        `  ${customers.length} customers, ${credits.length} credits, ${ledgerEntries.length} ledger entries`,
        `  ${dailyCloses.length} daily closes, ${users.length} users`,
        '',
        `Every seeded user has the password "${DEV_PASSWORD}" — development only.`,
      ].join('\n'),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
