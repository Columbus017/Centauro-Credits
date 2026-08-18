# SPEC 03 — Toast notifications

> **Status:** Implemented
> **Depends on:** —
> **Date:** 2026-08-17
> **Objective:** Add success-confirmation toasts, built on @base-ui/react's already-installed Toast primitive, across every write flow that today gives the operator no feedback that it worked.

---

## Scope

**In:**

- New `components/ui/toast.tsx` wrapping `@base-ui/react/toast` (`Provider`, `Viewport`, `Root`, `Title`, `Close`), styled from the existing token set (`bg-popover`, `border`, etc.) the same way `components/ui/dialog.tsx` is.
- One `Toast.Provider` + `Toast.Viewport` mounted in `app/[locale]/layout.tsx`, so both the authenticated shell and the unauthenticated `/login` screen can toast.
- A generic `toast.success(message)` helper (`@base-ui/react`'s `useToastManager`/`createToastManager`) wired into three call shapes:
  1. **`useActionState` flows** (`ok: true`, no redirect) — `recordPayment` (`record-payment-dialog.tsx`), `createUser` (`new-user-dialog.tsx`), `createCommerce` (`commerce-card.tsx`).
  2. **Plain `ActionButton` flows** (void action, no return value) — `components/forms/action-button.tsx` fires a toast when `useFormStatus().pending` flips `true → false`, message passed as a new prop. Applies to `setCollectorActive`, `setRouteActive`, `setCustomerActive`, `setCommerceActive`, `setUserActive`, `voidPayment`.
  3. **Redirect flows** — a one-shot `?toast=<key>` search param appended to the `redirect()` target: `login`, `createCollector`/`updateCollector`, `createRoute`/`updateRoute`, `createCustomer`/`updateCustomer`, `createCredit`/`updateCredit`, `deleteCredit`, `importCreditHistory`, `submitDailyClose`. A small client component reads it once (`useSearchParams`), fires the toast, then `router.replace()`s it away.
- `proxy.ts`'s `localized()` helper preserves `request.nextUrl.search` so `?toast=loginSuccess` survives the collector role-home redirect from `/`.
- One new message key per action under a `toast` namespace in `messages/es.json` + `messages/en.json`.

**Out of scope (for future specs):**

- Error toasts of any kind — every existing `FormError`/`FieldError` inline banner is untouched.
- A `logout` toast — it redirects into an unauthenticated context where the confirmation has little value, and it wasn't part of the original ask.
- Per-action-type icon/color variants, custom duration per toast, or a "clear all" control — one consistent success style, one default auto-dismiss duration.
- Any UI outside `app/[locale]/` (this repo has no other route group needing it).

---

## Data model

No database change. One new UI primitive, a handful of signature/prop additions, and message keys.

**1. `components/ui/toast.tsx`** — wraps `@base-ui/react/toast`, styled from the same tokens as `components/ui/dialog.tsx`:

```ts
// A module-level manager (not a hook) so any client component — a dialog,
// ActionButton, or the redirect listener — can fire a toast without being
// inside the Provider's own render tree.
export const toastManager = createToastManager()

export function toastSuccess(message: string): void
// = toastManager.add({ title: message, type: 'success' })

// Mounted once in app/[locale]/layout.tsx. Wraps Base UI's Toast.Provider
// (bound to `toastManager`) + Toast.Viewport, and renders the active
// `useToastManager().toasts` as styled Toast.Root/Title/Close elements.
export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement
```

**2. `ActionButton` gains one optional prop** (`components/forms/action-button.tsx`):

```ts
{
  // ...existing props
  /** Fired via toastSuccess() when useFormStatus().pending flips true→false. */
  toastMessage?: string
}
```

**3. New `components/toast-redirect-listener.tsx`**, mounted once in `app/[locale]/layout.tsx` next to `ToastProvider`:

```ts
// Reads `?toast=<key>` once via useSearchParams(), calls
// toastSuccess(t(key)), then router.replace()s the URL with the param
// stripped. A no-op render when the param is absent.
export function ToastRedirectListener(): null
```

**4. `proxy.ts`'s `localized()` helper appends the incoming search string:**

```ts
// target already carries the locale-prefixed path; `request.nextUrl.search`
// (e.g. "?toast=loginSuccess") is preserved across every proxy-issued
// redirect, not just the post-login one.
```

**5. New `toast` message namespace** in `messages/es.json` + `messages/en.json` — one key per action, reused by whichever of the three mechanisms fires it:

| Key | Fired by |
| --- | --- |
| `loginSuccess` | `login` (via `?toast=`, through the `localized()` fix) |
| `collectorCreated`, `collectorUpdated` | `createCollector`, `updateCollector` (`?toast=`) |
| `collectorActivated`, `collectorDeactivated` | `setCollectorActive` (`ActionButton`) |
| `routeCreated`, `routeUpdated` | `createRoute`, `updateRoute` (`?toast=`) |
| `routeActivated`, `routeDeactivated` | `setRouteActive` (`ActionButton`) |
| `customerCreated`, `customerUpdated` | `createCustomer`, `updateCustomer` (`?toast=`) |
| `customerActivated`, `customerDeactivated` | `setCustomerActive` (`ActionButton`) |
| `commerceCreated` | `createCommerce` (`useActionState` `ok:true`) |
| `commerceActivated`, `commerceDeactivated` | `setCommerceActive` (`ActionButton`) |
| `creditCreated`, `creditUpdated` | `createCredit`, `updateCredit` (`?toast=`) |
| `creditDeleted` | `deleteCredit` (`?toast=`, despite being triggered via `ActionButton`) |
| `creditHistoryImported` | `importCreditHistory` (`?toast=`) |
| `dailyCloseSaved` | `submitDailyClose` (`?toast=`) |
| `paymentRecorded` | `recordPayment` (`useActionState` `ok:true`) |
| `paymentVoided` | `voidPayment` (`ActionButton`) |
| `userCreated` | `createUser` (`useActionState` `ok:true`) |
| `userActivated`, `userDeactivated` | `setUserActive` (`ActionButton`) |

---

## Implementation plan

1. Create `components/ui/toast.tsx` — `toastManager`, `toastSuccess()`, and the styled `ToastProvider` (`Toast.Provider` + `Toast.Viewport` + a list mapping `useToastManager().toasts` to `Toast.Root`/`Title`/`Close`), tokens matched to `components/ui/dialog.tsx`. Not mounted anywhere yet. Test: `pnpm typecheck && pnpm lint`.
2. Mount `<ToastProvider>` in `app/[locale]/layout.tsx`. Test: `pnpm dev`, load any page, confirm no visual change (empty viewport).
3. Add the full `toast` namespace (table above) to `messages/es.json` + `messages/en.json`. Test: both files parse and have identical key shape.
4. Wire the three `useActionState` flows — `recordPayment`, `createUser`, `createCommerce` — to call `toastSuccess(t('toast.…'))` when `state.ok` flips true, using the same "seen state" pattern `record-payment-dialog.tsx` already has. Test: record a payment, create a user, create a commerce; confirm the toast fires and each dialog still closes as before.
5. Add `toastMessage` to `ActionButton`; fire `toastSuccess(toastMessage)` when `useFormStatus().pending` flips `true → false` and the prop is set. Test: `pnpm typecheck`.
6. Pass `toastMessage` at the six `ActionButton` call sites (`collectors/[id]`, `routes/[id]`, `clients/[id]`, `commerce-card.tsx`, `admin/users/page.tsx`, and `voidPayment` on `credits/[id]`), computing Activated/Deactivated from the new state. Test: toggle a collector active/inactive, void a payment; confirm the toast text matches and the row still updates.
7. Create `components/toast-redirect-listener.tsx` (reads `?toast=`, fires `toastSuccess(t(key))`, `router.replace()`s it away) and mount it in `app/[locale]/layout.tsx`. Test: visit any page with `?toast=paymentRecorded` by hand; confirm the toast fires once and the param disappears from the address bar.
8. Append `?toast=<key>` to the nine `redirect()` targets across `lib/actions/entities.ts` and `lib/actions/credits.ts`. Test: create/edit a collector, route, client, credit; delete a credit; import credit history; submit a daily close — each lands on its destination with the matching toast.
9. Fix `proxy.ts`'s `localized()` to preserve `request.nextUrl.search`; append `?toast=loginSuccess` to `login`'s `signIn` `redirectTo`. Test: `pnpm build && pnpm start` (CLAUDE.md's rule — dev mode hides this class of failure); log in as `mveliz` (admin, home `/`) and `cmejia` (collector, home elsewhere), confirm both see the toast.

---

## Acceptance criteria

**Toast primitive**

- [x] The toast provider renders on every page, authenticated and `/login`, with no visible viewport when nothing is active.
- [x] A fired toast matches the rest of the UI in both light and dark mode (existing tokens, no hardcoded colors).
- [x] A toast auto-dismisses after its default timeout and can also be dismissed via its close control.

**`useActionState` flows**

- [x] Recording a payment via the "Registrar pago" dialog shows `paymentRecorded`; the dialog still closes as before.
- [x] Creating a user via the new-user dialog shows `userCreated`; the dialog still closes as before.
- [x] Creating a commerce shows `commerceCreated`.

**`ActionButton` flows**

- [x] Activating/deactivating a collector, route, client, commerce, or user shows the matching Activated/Deactivated toast and the status badge updates.
- [x] Voiding a payment shows `paymentVoided` and the credit's balance updates.
- [x] Deleting a credit lands on `/credits` and shows `creditDeleted`.

**Redirect flows**

- [x] Creating/editing a collector, route, client, or credit lands on the destination page with the matching Created/Updated toast, and `?toast=` is gone from the address bar once it fires.
- [x] Importing credit history lands on the credit detail page with `creditHistoryImported`.
- [x] Submitting a daily close lands on `/daily-close` with `dailyCloseSaved`.
- [x] Logging in as an admin (home `/`) shows `loginSuccess`.
- [x] Logging in as a collector (home elsewhere) also shows `loginSuccess` — confirms the query string survives `proxy.ts`'s role-home redirect.

**No regressions**

- [x] `pnpm test`, `pnpm typecheck`, and `pnpm lint` all pass.
- [x] `pnpm build && pnpm start` serves every touched screen without an Auth.js or hydration error.
- [x] Both locales show translated toast text, never a raw message key.
- [x] Every existing inline error banner (`FormError`/`FieldError`, login's invalid-credentials message) still renders exactly as before — no toast fires on any failure path.

---

## Decisions

- **Yes:** `@base-ui/react`'s Toast primitive (already installed). No new dependency, and it matches the pattern every other `components/ui/*` primitive in this repo already follows (Dialog, Select, Combobox all wrap the same package).
- **No:** Sonner. Faster to wire up, but a new dependency with its own theming that would have to be bridged to this repo's oklch token system and the DOM-owned `dark` class, for no real benefit over what's already installed.
- **Yes:** success toasts only. Every write already surfaces its failure inline (`FormError`/`FieldError`), and duplicating that as a toast doubles the signal without adding information.
- **No:** error toasts. Would mean two UIs disagreeing about the same failure — the inline banner stays authoritative.
- **No:** a `logout` toast. It redirects into an unauthenticated context where a confirmation has little value, and it wasn't part of the original ask.
- **Yes:** a module-level `toastManager` (via `createToastManager()`) rather than routing every call site through `useToastManager()`'s hook. It lets `ActionButton`, dialogs, and the redirect listener fire a toast without needing to sit inside the Provider's own render tree — the Provider only needs to bind to it once.
- **Yes:** a `?toast=<key>` URL param for redirect-based successes, not a cookie. This repo already treats the URL as the source of truth for screen state ("the filters are the URL" — SPEC 02); a one-shot param fits that convention directly and needs no server-side cookie plumbing.
- **Yes:** `ActionButton` gains a generic `toastMessage` prop rather than each of its six call sites reinventing completion detection. One shared change (`pending` flipping `true → false`) gives all six flows a confirmation for free.
- **Yes:** `deleteCredit` uses the `?toast=` redirect mechanism despite being triggered through `ActionButton`, not the `ActionButton` pending-flip. It redirects to `/credits` on success, so the component that would detect `pending` flipping false unmounts before it can act — the URL param is the only thing that survives the navigation.
- **Yes:** fixing `proxy.ts`'s `localized()` to preserve `request.nextUrl.search`. Without it, `?toast=loginSuccess` silently vanishes for every collector (whose post-login redirect goes through this helper) and only ever fires for admins — an inconsistency worse than the missing toast itself.
- **No:** skipping the login toast to avoid touching `proxy.ts`. The fix is small and general (any future `?query=` param benefits, not just this one), and the auth-file risk is bounded by the existing `pnpm build && pnpm start` check CLAUDE.md already requires for auth changes.
- **No:** per-action-type icons, colors, or per-toast custom durations. One consistent success style keeps this a small, uniform feature rather than a design system in miniature.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `proxy.ts`'s `localized()` is used for three different redirects (unauth → `/login`, signed-in-user-on-login-page → home, `/` → collector home). Making it preserve `search` unconditionally could leak an unrelated query param across a redirect nobody asked to carry one. | The only redirect that currently sets a query string is `login`'s `?toast=loginSuccess`, and it's harmless if it ever showed up somewhere unexpected — worst case is a toast firing once on the wrong page, not a security issue. Acceptance criteria exercise both the admin and collector login paths by hand. |
| `deleteCredit` is invoked via `ActionButton` but redirects, unlike the other six `ActionButton` flows. A future contributor adding a seventh `ActionButton` call site could assume `toastMessage` is always the right mechanism and miss that a redirecting action needs `?toast=` instead. | Documented explicitly in Decisions; the implementation plan's step 8 groups `deleteCredit` with the other `redirect()` targets, not with step 6's `ActionButton` wiring. |
| Base UI's Toast is a newer, less battle-tested part of `@base-ui/react` than Select or Dialog. | Confined entirely to `components/ui/toast.tsx`; every call site only ever sees `toastSuccess(message: string)`, so a future API change is a one-file fix. |
| 26 new message keys across two locale files is a lot of surface for a typo or missing translation to slip through. | Step 3's acceptance check (`both files parse and have identical key shape`) plus the "both locales show translated text" acceptance criterion catch a missing key before it ships. |

---

## What is **not** in this spec

- Error toasts of any kind — every existing `FormError`/`FieldError` inline banner is untouched.
- A `logout` confirmation toast.
- Per-action-type icons, colors, custom per-toast durations, or a "clear all" control.
- Any UI outside `app/[locale]/`.

Each one, if it lands, goes in its own spec.
