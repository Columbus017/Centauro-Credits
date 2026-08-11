/**
 * The contract between a Server Action and the form that submitted it.
 *
 * Separate from `lib/actions/shared.ts` because that module is `server-only`
 * — it reaches for `revalidatePath` — while every form is a Client Component
 * and needs this shape at runtime for `useActionState`'s initial value.
 */
export type FormState = {
  /** A key under the `errors` message namespace, for the form as a whole. */
  error?: string
  /** Field name → key under `errors`. */
  fieldErrors?: Record<string, string>
}

export const EMPTY_STATE: FormState = {}
