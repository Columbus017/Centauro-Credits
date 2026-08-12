/**
 * The ledger rules, as one pure module.
 *
 * These three functions are the whole product: a credit's payoff total, the
 * running balance after each payment, and whether a paid-off credit earned a
 * bad record. In the legacy app the same arithmetic is copy-pasted across four
 * PHP files (`BLL/credit.php` twice, `BLL/balance.php`, `BLL/balanceOp.php`),
 * which is exactly how the void path and the daily-close path drifted apart.
 * Everything that touches money — the ETL, the seed, and the Server Actions
 * Phase 4 adds — goes through here.
 *
 * Money is handled in integer centavos. The old columns were floats and
 * `0.1 + 0.2` problems are visible in the data; a ledger that must reconcile
 * to the centavo has no business using binary floating point.
 */

import { daysBetween } from '@/lib/format'

/** Flat 15%, every credit the business has ever written. */
export const DEFAULT_INTEREST_RATE = 0.15

/** Payoff is graced for 30 days; beyond that the client gets a bad record. */
export const GOOD_RECORD_DAYS = 30

// ------------------------------------------------------------------- money

/** `1234.56` → `123456`. Accepts the string form Prisma `Decimal` serialises to. */
export function toCents(amount: number | string): number {
  const value = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(value)) {
    throw new TypeError(`Not a finite amount: ${amount}`)
  }
  return Math.round(value * 100)
}

/** `123456` → `1234.56`, for handing back to Prisma's `Decimal` columns. */
export function fromCents(cents: number): number {
  return cents / 100
}

/**
 * What a credit must repay: `principal * (1 + rate)`, rounded to the centavo.
 *
 * The legacy code computes `$total * 0.15` and adds it, in float. Rounding at
 * the centavo here is what makes the ETL's balance assertion meaningful.
 */
export function payoffTotalCents(
  principal: number | string,
  interestRate: number | string = DEFAULT_INTEREST_RATE,
): number {
  const rate = typeof interestRate === 'string' ? Number(interestRate) : interestRate
  return Math.round(toCents(principal) * (1 + rate))
}

// ------------------------------------------------------------- daily close

export type DailyCloseAmounts = {
  base: number
  collected: number
  disbursed: number
  surplus: number
}

/**
 * The cash a collector owes at the end of the day:
 * `(base + collected) - (disbursed + surplus)`.
 *
 * `dashCash.php` computed this in SQL and `newIncome.php` recomputed it in
 * JavaScript, which is two places for one formula. In centavos, so a day of
 * float additions cannot leave the till a centavo short.
 */
export function dailyCloseCash(amounts: DailyCloseAmounts): number {
  return fromCents(
    toCents(amounts.base) +
      toCents(amounts.collected) -
      (toCents(amounts.disbursed) + toCents(amounts.surplus)),
  )
}

// ------------------------------------------------------------------ ledger

export type LedgerKind = 'origination' | 'payment'

/** The minimum a row must expose to take part in a recalculation. */
export type LedgerRow = {
  id: number
  kind: LedgerKind
  amountCents: number
  voided: boolean
}

export type RecalculatedRow = LedgerRow & { runningBalanceCents: number }

/**
 * Re-derives `runningBalance` for every row of one credit.
 *
 * Rows must arrive in ledger order (`id` ascending) — that, not `entryDate`,
 * is the order the legacy app posts and re-derives in, and back-dated payments
 * do occur. Voided rows contribute nothing and carry the balance unchanged;
 * their stored value in the legacy data is stale, so callers comparing against
 * MySQL must skip them.
 *
 * Mirrors the `state = 0 ORDER BY idBalance ASC` walk in `BLL/balance.php`.
 */
export function recalculateBalances(rows: LedgerRow[]): RecalculatedRow[] {
  let balanceCents = 0
  let seenOrigination = false

  return rows.map((row) => {
    if (!row.voided) {
      if (!seenOrigination) {
        // The first live row sets the opening balance whatever its kind: a
        // credit whose origination row is missing still has to reconcile.
        balanceCents = row.amountCents
        seenOrigination = true
      } else {
        balanceCents -= row.amountCents
      }
    }
    return { ...row, runningBalanceCents: balanceCents }
  })
}

/** The balance still owed after every non-voided row, never below zero. */
export function outstandingCents(rows: LedgerRow[]): number {
  const recalculated = recalculateBalances(rows)
  const last = recalculated.at(-1)
  return Math.max(last?.runningBalanceCents ?? 0, 0)
}

// ------------------------------------------------------------------ payoff

export type PayoffState = {
  paidOff: boolean
  /** `YYYY-MM-DD` of the payment that cleared the balance, or `null`. */
  cancelledAt: string | null
  badRecord: boolean
}

type DatedRow = LedgerRow & { entryDate: string }

/**
 * Whether a credit is paid off, when, and whether that took too long.
 *
 * The legacy query measures the gap from `credit.dateStart` to the date of the
 * *last non-voided ledger row* — not to the row that happened to zero the
 * balance. With back-dated payments those differ, and this reproduces the
 * legacy choice deliberately.
 */
export function payoffState(startDate: string, rows: DatedRow[]): PayoffState {
  const paidOff = rows.length > 0 && outstandingCents(rows) <= 0
  if (!paidOff) {
    return { paidOff: false, cancelledAt: null, badRecord: false }
  }

  const live = rows.filter((row) => !row.voided)
  const cancelledAt = live.at(-1)?.entryDate ?? null
  const badRecord = cancelledAt
    ? daysBetween(startDate, cancelledAt) > GOOD_RECORD_DAYS
    : false

  return { paidOff, cancelledAt, badRecord }
}
