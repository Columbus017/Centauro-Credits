'use server'

import { z } from 'zod'

import { db } from '@/lib/db'
import { isoDate } from '@/lib/db-utils'
import {
  fromCents,
  outstandingCents,
  payoffTotalCents,
  payoffState,
  recalculateBalances,
  toCents,
} from '@/lib/ledger'
import { requireAdmin, requireUser } from '@/lib/session'
import { redirect } from '@/i18n/navigation'
import {
  foreignKey,
  isoDateString,
  localeFrom,
  money,
  moneyOrZero,
  parseForm,
  requiredText,
  revalidateLedger,
  type FormState,
} from '@/lib/actions/shared'
import type { PrismaClient } from '@/lib/generated/prisma/client'

/** The transactional client Prisma hands to an interactive transaction. */
type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Re-derives everything downstream of one credit's ledger, in one place.
 *
 * The legacy app open-coded this walk in four files — `BLL/credit.php` twice,
 * `BLL/balance.php` and its copy `BLL/balanceOp.php` — and they disagreed:
 * the payment path read the last balance without filtering voided rows, the
 * void path never revisited `cancel`, and each compared `balance == 0` in
 * float so an overpayment left a credit open forever. Every write below ends
 * here instead.
 */
async function syncCredit(tx: Tx, creditId: number) {
  const credit = await tx.credit.findUniqueOrThrow({
    where: { id: creditId },
    include: {
      ledgerEntries: { where: { deletedAt: null }, orderBy: { id: 'asc' } },
    },
  })

  const rows = credit.ledgerEntries.map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    amountCents: toCents(entry.amount.toString()),
    voided: entry.voidedAt !== null,
    entryDate: entry.entryDate.toISOString().slice(0, 10),
    storedBalanceCents: toCents(entry.runningBalance.toString()),
  }))

  for (const row of recalculateBalances(rows)) {
    const stored = rows.find((candidate) => candidate.id === row.id)!
    if (row.runningBalanceCents !== stored.storedBalanceCents) {
      await tx.ledgerEntry.update({
        where: { id: row.id },
        data: { runningBalance: fromCents(row.runningBalanceCents) },
      })
    }
  }

  const startDate = credit.startDate.toISOString().slice(0, 10)
  const state = payoffState(startDate, rows)

  await tx.credit.update({
    where: { id: creditId },
    data: {
      cancelledAt: state.cancelledAt ? isoDate(state.cancelledAt) : null,
      badRecord: state.badRecord,
    },
  })

  return state
}

// ------------------------------------------------------------------ credits

const creditSchema = z.object({
  customerId: foreignKey,
  collectorId: foreignKey,
  code: requiredText(40),
  startDate: isoDateString,
  principal: money,
})

/**
 * Ports `BLL/credit.php` — `nuevo`: the credit and its origination row in one
 * transaction, the origination carrying `principal × (1 + rate)` as both the
 * amount and the opening balance.
 */
export async function createCredit(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(creditSchema, formData)
  if (!parsed.ok) return parsed.state

  const { customerId, collectorId, code, startDate, principal } = parsed.data
  const totalDue = fromCents(payoffTotalCents(principal))

  const credit = await db.$transaction(async (tx) => {
    const created = await tx.credit.create({
      data: {
        customerId,
        collectorId,
        code,
        startDate: isoDate(startDate),
        principal,
      },
    })

    await tx.ledgerEntry.create({
      data: {
        creditId: created.id,
        kind: 'origination',
        entryDate: isoDate(startDate),
        amount: totalDue,
        runningBalance: totalDue,
      },
    })

    return created
  })

  revalidateLedger()
  redirect({
    href: { pathname: `/credits/${credit.id}`, query: { toast: 'creditCreated' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

/**
 * Ports `BLL/credit.php` — `editar`.
 *
 * Changing the principal moves the origination, so every later balance is
 * re-derived. The legacy version stopped there and left `cancel` as it found
 * it: raising the principal on a paid-off credit left it marked cancelled with
 * money outstanding. `syncCredit` re-derives the flag too, which is a
 * deliberate correction rather than a port.
 */
export async function updateCredit(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(creditSchema.extend({ id: foreignKey }), formData)
  if (!parsed.ok) return parsed.state

  const { id, customerId, collectorId, code, startDate, principal } = parsed.data

  await db.$transaction(async (tx) => {
    const credit = await tx.credit.findUnique({
      where: { id, deletedAt: null },
      include: {
        ledgerEntries: {
          where: { deletedAt: null, kind: 'origination' },
          orderBy: { id: 'asc' },
        },
      },
    })
    if (!credit) throw new Error(`No such credit: ${id}`)

    await tx.credit.update({
      where: { id },
      data: {
        customerId,
        collectorId,
        code,
        startDate: isoDate(startDate),
        principal,
      },
    })

    const origination = credit.ledgerEntries[0]
    const totalDue = fromCents(
      payoffTotalCents(principal, credit.interestRate.toString()),
    )

    if (origination) {
      await tx.ledgerEntry.update({
        where: { id: origination.id },
        data: { amount: totalDue, entryDate: isoDate(startDate) },
      })
    } else {
      // A credit whose origination row was lost — the ETL reports these rather
      // than inventing one. Editing it is a reasonable moment to restore it.
      await tx.ledgerEntry.create({
        data: {
          creditId: id,
          kind: 'origination',
          entryDate: isoDate(startDate),
          amount: totalDue,
          runningBalance: totalDue,
        },
      })
    }

    await syncCredit(tx, id)
  })

  revalidateLedger()
  redirect({
    href: { pathname: `/credits/${id}`, query: { toast: 'creditUpdated' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

/**
 * Soft delete.
 *
 * `BLL/credit.php` — `eliminar` — issued `DELETE FROM balance` followed by
 * `DELETE FROM credit`, destroying the entire payment history of a real loan
 * with no way back. Phase 2 settled on `deleted_at`; this is the intentional
 * behaviour change that decision was about.
 */
export async function deleteCredit(formData: FormData) {
  await requireAdmin()

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const now = new Date()
  await db.$transaction(async (tx) => {
    await tx.ledgerEntry.updateMany({
      where: { creditId: id, deletedAt: null },
      data: { deletedAt: now },
    })
    await tx.credit.update({ where: { id }, data: { deletedAt: now } })
  })

  revalidateLedger()
  redirect({
    href: { pathname: '/credits', query: { toast: 'creditDeleted' } },
    locale: localeFrom(formData),
  })
}

// ----------------------------------------------------------------- payments

const paymentSchema = z.object({
  creditId: foreignKey,
  entryDate: isoDateString,
  amount: money,
})

/**
 * Ports `BLL/balance.php` — `pago`: append the row, then let `syncCredit`
 * decide whether the credit is paid off and whether it took too long.
 *
 * Collectors post payments for their own round only, which is checked here
 * rather than only on the screen that offered the button.
 */
export async function recordPayment(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser()

  const parsed = parseForm(paymentSchema, formData)
  if (!parsed.ok) return parsed.state

  const { creditId, entryDate, amount } = parsed.data

  try {
    await db.$transaction(async (tx) => {
      const credit = await tx.credit.findFirst({
        where: {
          id: creditId,
          deletedAt: null,
          ...(user.role === 'collector' && user.collectorId !== null
            ? { collectorId: user.collectorId }
            : {}),
        },
        include: {
          ledgerEntries: { where: { deletedAt: null }, orderBy: { id: 'asc' } },
        },
      })
      if (!credit) throw new ActionError('notFound')

      const rows = credit.ledgerEntries.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        amountCents: toCents(entry.amount.toString()),
        voided: entry.voidedAt !== null,
      }))

      // `new_totalB < 0` in the legacy validation: a payment may clear the
      // balance but never take more than is owed.
      const remaining = outstandingCents(rows)
      if (toCents(amount) > remaining) throw new ActionError('overpayment')

      await tx.ledgerEntry.create({
        data: {
          creditId,
          kind: 'payment',
          entryDate: isoDate(entryDate),
          amount,
          // Replaced by `syncCredit`; written so the column is never null.
          runningBalance: fromCents(remaining - toCents(amount)),
        },
      })

      await syncCredit(tx, creditId)
    })
  } catch (error) {
    if (error instanceof ActionError) return { error: error.key }
    throw error
  }

  revalidateLedger()
  return { ok: true }
}

/**
 * Ports `BLL/balance.php` — `anular`.
 *
 * The legacy void re-walked the later balances but never revisited `cancel`,
 * so voiding the payment that closed a credit left it cancelled with money
 * owing. `syncCredit` re-derives both.
 */
export async function voidPayment(formData: FormData) {
  await requireAdmin()

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  await db.$transaction(async (tx) => {
    const entry = await tx.ledgerEntry.findUnique({ where: { id } })
    if (!entry || entry.kind !== 'payment' || entry.voidedAt) return

    await tx.ledgerEntry.update({
      where: { id },
      data: { voidedAt: new Date() },
    })
    await syncCredit(tx, entry.creditId)
  })

  revalidateLedger()
}

// ------------------------------------------------------------ history import

const historySchema = creditSchema.extend({
  /** `[{ date, amount }]`, the shape `newHistory.php` posted as `json`. */
  payments: z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value) as unknown
      } catch {
        ctx.addIssue({ code: 'custom', message: 'invalid' })
        return z.NEVER
      }
    })
    .pipe(
      z.array(
        z.object({
          date: isoDateString,
          amount: z.number().positive().or(z.string().pipe(money)),
        }),
      ),
    ),
})

/**
 * Ports `BLL/credit.php` — `nuevo-historial`, the "ingresar existente" screen:
 * a credit that predates the system, entered with the payments already made.
 */
export async function importCreditHistory(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(historySchema, formData)
  if (!parsed.ok) return parsed.state

  const { customerId, collectorId, code, startDate, principal, payments } = parsed.data
  const totalDue = fromCents(payoffTotalCents(principal))

  let creditId = 0
  try {
    await db.$transaction(async (tx) => {
      const credit = await tx.credit.create({
        data: {
          customerId,
          collectorId,
          code,
          startDate: isoDate(startDate),
          principal,
        },
      })
      creditId = credit.id

      await tx.ledgerEntry.create({
        data: {
          creditId: credit.id,
          kind: 'origination',
          entryDate: isoDate(startDate),
          amount: totalDue,
          runningBalance: totalDue,
        },
      })

      let remaining = toCents(totalDue)
      for (const payment of payments) {
        const amountCents = toCents(payment.amount)
        if (amountCents > remaining) throw new ActionError('overpayment')
        remaining -= amountCents

        await tx.ledgerEntry.create({
          data: {
            creditId: credit.id,
            kind: 'payment',
            entryDate: isoDate(payment.date),
            amount: payment.amount,
            runningBalance: fromCents(remaining),
          },
        })
      }

      await syncCredit(tx, credit.id)
    })
  } catch (error) {
    if (error instanceof ActionError) return { error: error.key }
    throw error
  }

  revalidateLedger()
  redirect({
    href: { pathname: `/credits/${creditId}`, query: { toast: 'creditHistoryImported' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

// --------------------------------------------------------------- daily close

const dailyCloseSchema = z.object({
  collectorId: foreignKey,
  closeDate: isoDateString,
  base: moneyOrZero,
  disbursed: moneyOrZero,
  surplus: moneyOrZero,
  payments: z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value) as unknown
      } catch {
        ctx.addIssue({ code: 'custom', message: 'invalid' })
        return z.NEVER
      }
    })
    .pipe(
      z.array(
        z.object({
          /**
           * Deliberately permissive, and validated in the action body instead.
           *
           * `parseForm` reports every schema failure as the generic
           * `checkFields` banner, which for a repeater posted as one JSON
           * field names nothing the operator can find. Letting an absent
           * credit through to an `ActionError` gets them `creditRequired` —
           * the same sentence the form itself shows.
           */
          creditId: z.union([z.number(), z.string()]).nullish(),
          amount: z.number().positive().or(z.string().pipe(money)),
        }),
      ),
    ),
})

/** A posted `creditId`, or `null` when the row named no credit at all. */
function paymentCreditId(value: number | string | null | undefined) {
  const raw = value == null ? '' : String(value).trim()
  return /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null
}

/**
 * Ports `newIncome.php` + `BLL/credit.php` — `nuevo-ingreso`.
 *
 * One `daily_closes` row and one ledger row per payment, in a single
 * transaction: the legacy version committed the income row first and posted
 * payments after, so a failure halfway through left a close claiming money
 * that no credit had received.
 *
 * `collected` is the sum of the posted payments rather than a number typed
 * alongside them — in the legacy form the operator entered both, and they
 * could disagree.
 */
export async function submitDailyClose(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(dailyCloseSchema, formData)
  if (!parsed.ok) return parsed.state

  const { collectorId, closeDate, base, disbursed, surplus, payments } = parsed.data
  const collected = fromCents(
    payments.reduce((sum, payment) => sum + toCents(payment.amount), 0),
  )

  try {
    // The form blocks this before it can be submitted; the check is here
    // because the form is not the only thing that can post to an action, and
    // guessing a credit for money that named none is how the legacy app put
    // payments on the wrong card.
    const rows = payments.map((payment) => {
      const creditId = paymentCreditId(payment.creditId)
      if (creditId === null) throw new ActionError('creditRequired')
      return { creditId, amount: payment.amount }
    })

    await db.$transaction(async (tx) => {
      const existing = await tx.dailyClose.findFirst({
        where: { collectorId, closeDate: isoDate(closeDate) },
        select: { id: true },
      })
      // **This is now the only thing stopping a duplicate close.** The
      // database constraint Phase 2 added was dropped when the real dump
      // turned out to hold 11 legitimate historical duplicates — see the note
      // on `DailyClose` in `prisma/schema.prisma`. The legacy app had no check
      // at either level and double-counted the day on every dashboard.
      if (existing) throw new ActionError('duplicateClose')

      await tx.dailyClose.create({
        data: {
          collectorId,
          closeDate: isoDate(closeDate),
          collected,
          base,
          disbursed,
          surplus,
        },
      })

      for (const payment of rows) {
        const credit = await tx.credit.findFirst({
          where: { id: payment.creditId, deletedAt: null, collectorId },
          include: {
            ledgerEntries: { where: { deletedAt: null }, orderBy: { id: 'asc' } },
          },
        })
        if (!credit) throw new ActionError('creditNotOnRound')

        const remaining = outstandingCents(
          credit.ledgerEntries.map((entry) => ({
            id: entry.id,
            kind: entry.kind,
            amountCents: toCents(entry.amount.toString()),
            voided: entry.voidedAt !== null,
          })),
        )
        if (toCents(payment.amount) > remaining) throw new ActionError('overpayment')

        await tx.ledgerEntry.create({
          data: {
            creditId: credit.id,
            kind: 'payment',
            entryDate: isoDate(closeDate),
            amount: payment.amount,
            runningBalance: fromCents(remaining - toCents(payment.amount)),
          },
        })

        await syncCredit(tx, credit.id)
      }
    })
  } catch (error) {
    if (error instanceof ActionError) return { error: error.key }
    throw error
  }

  revalidateLedger()
  redirect({
    href: { pathname: '/daily-close', query: { toast: 'dailyCloseSaved' } },
    locale: localeFrom(formData),
  })
  // Unreachable: `redirect` throws. TypeScript cannot see that through
  // next-intl's destructured export.
  return {}
}

/** A failure the operator can act on, carried as a message key. */
class ActionError extends Error {
  constructor(readonly key: string) {
    super(key)
  }
}
