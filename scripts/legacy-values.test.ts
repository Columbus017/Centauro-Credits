import { describe, expect, it } from 'vitest'

import { flag, money } from './legacy-values'

/**
 * These two functions decide what the migrated database says. `flag()` alone
 * decides whether a ledger row is a payment or an origination, whether a
 * payment is voided, whether a credit is cancelled, and whether a deactivated
 * login stays deactivated — 61,868 rows' worth of meaning, from one coercion.
 *
 * The cases below are not hypothetical shapes. `Buffer` is what `mysql2`
 * returns for the real `bit(1)` columns and the string is what it returns for
 * the real `decimal(9,2)` ones; the numbers are what the fixture returned
 * before it was corrected, and both must keep working.
 */
describe('flag', () => {
  it('reads a bit(1) Buffer, which is what MySQL actually sends', () => {
    expect(flag(Buffer.from([0x01]))).toBe(true)
    expect(flag(Buffer.from([0x00]))).toBe(false)
  })

  it('is false only when every byte is zero', () => {
    expect(flag(Buffer.from([0x00, 0x00]))).toBe(false)
    expect(flag(Buffer.from([0x00, 0x01]))).toBe(true)
    expect(flag(Buffer.from([]))).toBe(false)
  })

  it('still reads the int(1) the reconstructed fixture used', () => {
    expect(flag(1)).toBe(true)
    expect(flag(0)).toBe(false)
  })

  it('reads booleans and numeric strings', () => {
    expect(flag(true)).toBe(true)
    expect(flag(false)).toBe(false)
    expect(flag('1')).toBe(true)
    expect(flag('0')).toBe(false)
    expect(flag('')).toBe(false)
  })

  it('treats a missing flag as not set, matching the column default', () => {
    expect(flag(null)).toBe(false)
    expect(flag(undefined)).toBe(false)
  })

  it('never reports a set flag as unset — the failure that would corrupt the ledger', () => {
    // The bug this replaces: `Buffer === 1` is false, so every payment in the
    // database would have been imported as an origination.
    const asMysqlSendsIt: unknown = Buffer.from([0x01])
    expect(asMysqlSendsIt === 1).toBe(false)
    expect(flag(asMysqlSendsIt as Buffer)).toBe(true)
  })
})

describe('money', () => {
  it('passes a decimal(9,2) string through untouched', () => {
    expect(money('1150.00')).toBe('1150.00')
    expect(money('383.32')).toBe('383.32')
    expect(money('0.00')).toBe('0.00')
    expect(money('-25.50')).toBe('-25.50')
  })

  it('does not send an exact decimal on a round trip through a float', () => {
    // 9,999,999.99 is the widest decimal(9,2) there is; going via Number and
    // back is lossless here, but not doing it at all is the point.
    expect(money('9999999.99')).toBe('9999999.99')
  })

  it('still formats the double the fixture used', () => {
    expect(money(1150)).toBe('1150.00')
    expect(money(383.326)).toBe('383.33')
  })

  it('rounds a float the way a float rounds, which is why the real columns are not floats', () => {
    // 383.325 is held as 383.32499999…, so `toFixed(2)` rounds *down*. Nothing
    // here can fix that — it is the argument for the string path above, and for
    // `Decimal(12,2)` in the new schema.
    expect(money(383.325)).toBe('383.32')
    expect(money('383.325')).toBe('383.32')
  })

  it('normalises a string that is not already two-decimal', () => {
    expect(money('1150')).toBe('1150.00')
    expect(money('1150.5')).toBe('1150.50')
  })

  it('treats a missing amount as zero', () => {
    expect(money(null)).toBe('0.00')
    expect(money(undefined)).toBe('0.00')
  })

  it('refuses something that is not a number at all', () => {
    expect(() => money('abc')).toThrow(TypeError)
    expect(() => money(Number.NaN)).toThrow(TypeError)
  })
})
