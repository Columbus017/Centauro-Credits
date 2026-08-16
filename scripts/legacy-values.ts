/**
 * Coercions for the two legacy column types whose JavaScript shape is not what
 * you would guess — and which the reconstructed fixture guessed wrong.
 *
 * Phase 2 rebuilt the old schema from the SQL strings inside the PHP, because
 * no dump existed. Two of those guesses were wrong, and the real
 * `mysqldump` (MySQL 5.7.44) settled it:
 *
 * | Column                                  | Guessed  | Actually       |
 * | --------------------------------------- | -------- | -------------- |
 * | `balpay`, `cancel`, `record`, `state`   | `int(1)` | **`bit(1)`**   |
 * | `total`, `amount`, `balance`, `income.*`| `double` | **`decimal(9,2)`** |
 *
 * Both differences change what `mysql2` hands back, and both broke the ETL in
 * ways worth naming, because they are the reason this module exists rather
 * than an inline `=== 1`.
 */

/**
 * A legacy boolean.
 *
 * `bit(1)` arrives from `mysql2` as a one-byte **Buffer** (`<Buffer 00>` /
 * `<Buffer 01>`), never as a number — so `value === 1` is false for *every*
 * row, in both directions. Left uncorrected that made every ledger entry an
 * origination, no payment voided, no credit cancelled, and — through the
 * inverted `state !== 1` test — every deactivated customer, collector and
 * login active again.
 *
 * The other shapes stay supported on purpose: `int(1)` (a number) is what the
 * fixture used before it was corrected, and a driver option away from either.
 */
export type LegacyFlag = Buffer | number | boolean | string | null | undefined

/**
 * A legacy money column.
 *
 * `decimal(9,2)` arrives as a **string**, because that is how `mysql2` avoids
 * handing you a float for a fixed-point column. Calling `.toFixed()` on it
 * throws, which is how this one announced itself.
 */
export type LegacyMoney = string | number | null | undefined

/**
 * Whether a legacy flag column is set.
 *
 * `NULL` reads as false: the old schema defaults every one of these to `b'0'`,
 * and a missing flag has never meant "yes".
 */
export function flag(value: LegacyFlag): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  // `'0'` is the only false string MySQL produces here; `''` guards a column
  // that was written blank rather than zeroed.
  if (typeof value === 'string') return value !== '' && value !== '0'
  // A `bit(n)` wider than one byte would still be false only if every byte is.
  if (Buffer.isBuffer(value)) return value.some((byte) => byte !== 0)
  return Boolean(value)
}

/**
 * A legacy money column as the fixed-point string a Prisma `Decimal` wants.
 *
 * A `decimal(9,2)` string is already in exactly that form, so it is passed
 * through untouched rather than being sent on a round trip through a float —
 * the one thing the new schema exists to stop.
 */
export function money(value: LegacyMoney): string {
  if (value === null || value === undefined) return '0.00'

  if (typeof value === 'string') {
    if (/^-?\d+\.\d{2}$/.test(value)) return value

    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      throw new TypeError(`Not a legacy money value: ${JSON.stringify(value)}`)
    }
    return parsed.toFixed(2)
  }

  if (!Number.isFinite(value)) {
    throw new TypeError(`Not a legacy money value: ${value}`)
  }
  return value.toFixed(2)
}
