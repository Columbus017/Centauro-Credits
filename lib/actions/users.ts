'use server'

import bcrypt from 'bcryptjs'
import { z } from 'zod'

import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import {
  optionalForeignKey,
  parseForm,
  requiredText,
  revalidate,
  type FormState,
} from '@/lib/actions/shared'

/** What PHP's `password_hash(..., PASSWORD_BCRYPT)` used, so the two agree. */
const BCRYPT_ROUNDS = 10

const userSchema = z.object({
  firstName: requiredText(80),
  lastName: requiredText(80),
  username: requiredText(60),
  password: z.string().min(8, 'passwordTooShort').max(200, 'tooLong'),
  role: z.enum(['admin', 'collector']),
  collectorId: optionalForeignKey,
})

/**
 * Ports `BLL/user.php` — `nuevo`.
 *
 * The legacy form had no minimum password length; eight characters is the one
 * addition, since these accounts reach every client's balance.
 */
export async function createUser(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin()

  const parsed = parseForm(userSchema, formData)
  if (!parsed.ok) return parsed.state

  const { password, collectorId, role, ...rest } = parsed.data

  const taken = await db.user.findUnique({
    where: { username: rest.username },
    select: { id: true },
  })
  if (taken) return { error: 'duplicateUsername', fieldErrors: { username: 'invalid' } }

  await db.user.create({
    data: {
      ...rest,
      role,
      // An admin has no round, so a collector link would only mislead.
      collectorId: role === 'collector' ? collectorId : null,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    },
  })

  revalidate('/admin/users')
  return { ok: true }
}

/**
 * The legacy `state = 1` soft delete for logins.
 *
 * An admin cannot deactivate their own account: the legacy app let them, and
 * the next request bounced them to a login they could no longer pass.
 */
export async function setUserActive(formData: FormData) {
  const current = await requireAdmin()

  const id = Number(formData.get('id'))
  const active = formData.get('active') === 'true'
  if (!Number.isInteger(id) || id === current.id) return

  await db.user.update({ where: { id }, data: { active } })
  revalidate('/admin/users')
}
