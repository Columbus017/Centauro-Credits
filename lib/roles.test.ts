import { describe, expect, it } from 'vitest'

import { canAccess, isPublicPath, roleHome, stripLocale } from './roles'

describe('stripLocale', () => {
  it('leaves the unprefixed default locale alone', () => {
    expect(stripLocale('/credits')).toBe('/credits')
    expect(stripLocale('/')).toBe('/')
  })

  it('drops a prefixed locale', () => {
    expect(stripLocale('/en/credits/12')).toBe('/credits/12')
    expect(stripLocale('/en')).toBe('/')
  })

  it('does not mistake a path segment for a locale', () => {
    // `/english` and `/es-something` are ordinary paths, not locale prefixes.
    expect(stripLocale('/english')).toBe('/english')
    expect(stripLocale('/estimates')).toBe('/estimates')
  })
})

describe('isPublicPath', () => {
  it('covers only the login screen', () => {
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/field/collect')).toBe(false)
  })
})

describe('canAccess as admin', () => {
  it.each(['/', '/clients', '/credits', '/credits/new', '/admin/users', '/reports'])(
    'allows %s',
    (path) => {
      expect(canAccess('admin', path)).toBe(true)
    },
  )

  it('denies the field screens, which are scoped to a collector_id an admin has not got', () => {
    expect(canAccess('admin', '/field/collect')).toBe(false)
    expect(canAccess('admin', '/field/today')).toBe(false)
  })
})

describe('canAccess as collector', () => {
  it('allows the two field screens', () => {
    expect(canAccess('collector', '/field/collect')).toBe(true)
    expect(canAccess('collector', '/field/today')).toBe(true)
  })

  it('allows the credit detail and receipt those screens link to', () => {
    // The legacy `listCreditsOp.php` opened the same ledger in a modal.
    expect(canAccess('collector', '/credits/12')).toBe(true)
    expect(canAccess('collector', '/payments/40/receipt')).toBe(true)
  })

  it.each([
    '/',
    '/clients',
    '/clients/3',
    '/credits',
    '/credits/new',
    '/credits/import',
    '/payments',
    '/collectors',
    '/routes',
    '/daily-close',
    '/reports',
    '/admin/users',
    '/admin/settings',
  ])('denies %s', (path) => {
    expect(canAccess('collector', path)).toBe(false)
  })

  it('does not let a lookalike path slip past the detail patterns', () => {
    // The sibling routes of `/credits/[id]` both create credits.
    expect(canAccess('collector', '/credits/new')).toBe(false)
    expect(canAccess('collector', '/credits/import')).toBe(false)
    expect(canAccess('collector', '/credits/12/edit')).toBe(false)
    expect(canAccess('collector', '/payments/40')).toBe(false)
    expect(canAccess('collector', '/payments/40/receipt/x')).toBe(false)
  })

  it('allows the 403 page itself, so a denial does not loop', () => {
    expect(canAccess('collector', '/forbidden')).toBe(true)
  })
})

describe('roleHome', () => {
  it('sends each role to the screen its nav starts on', () => {
    expect(roleHome('admin')).toBe('/')
    expect(roleHome('collector')).toBe('/field/collect')
  })
})
