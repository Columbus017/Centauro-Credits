# SPEC 05 — Cursor affordance and confirmation modal

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-08-18
> **Objective:** Give every button in the app a pointer cursor on hover, and replace the native `window.confirm()` used when deleting a credit with a styled `AlertDialog` built on the `@base-ui/react` primitive already used by every other `components/ui/*` wrapper.

---

## Scope

**In:**

- `components/ui/button.tsx`: `buttonVariants` gains `cursor-pointer` on the base class, plus `disabled:cursor-not-allowed` alongside the existing `disabled:pointer-events-none`. Fixes the pointer cursor on every button in the app that goes through this shared component — including "Registrar pago" (record-payment-dialog.tsx), "Eliminar" on a credit, and "Cerrar sesión" (app-shell-frame.tsx) — in one place.
- New `components/ui/alert-dialog.tsx`, wrapping `@base-ui/react/alert-dialog` (`Root`, `Trigger`, `Portal`, `Backdrop`, `Popup`, `Title`, `Description`, `Close`), styled from the same tokens as `components/ui/dialog.tsx` (`bg-popover`, `ring-foreground/10`, etc.).
- `components/forms/action-button.tsx`: the existing `confirm` prop (currently text passed to `window.confirm()`) is rewired to open the new `AlertDialog` instead. A new `confirmTitle` prop supplies the dialog's title. The dialog's "confirm" button submits the form and shows the existing `pending` → `tc('saving')` state; the dialog stays open until the action completes.
- The only current caller, `app/[locale]/credits/[id]/page.tsx`'s delete-credit `ActionButton`, gains the new `confirmTitle={tc('confirmDeleteTitle')}` prop alongside its existing `confirm={tc('confirmDelete')}`.
- One new message key, `common.confirmDeleteTitle`, in `messages/es.json` + `messages/en.json`.

**Out of scope (for future specs):**

- Cursor fixes on controls that don't go through the shared `Button` component — `Select`/`Combobox` triggers (`components/ui/select.tsx`, `searchable-select.tsx`), which have their own `className` and the same Tailwind-preflight issue.
- Adding a `confirm`/`confirmTitle` step to any `ActionButton` call site that doesn't have one today (deactivating a collector, route, client, user; voiding a payment) — only the existing delete-credit confirmation is being upgraded, not extended to new flows.
- Any change to `deleteCredit`'s server logic, redirect, or its `creditDeleted` toast (SPEC 03) — this spec only changes what happens *before* the form submits.
- Visual redesign of the `Button` component beyond the cursor property (colors, sizes, variants untouched).

---

## Data model

No database change. One new UI primitive, one new prop pair, one new message key.

**1. `components/ui/alert-dialog.tsx`** — wraps `@base-ui/react/alert-dialog`, styled the same way `components/ui/dialog.tsx` wraps `@base-ui/react/dialog`:

```ts
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props)
function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props)
function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props)
function AlertDialogOverlay({ className, ...props }: AlertDialogPrimitive.Backdrop.Props)
function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.Popup.Props)
function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props)
function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props)
function AlertDialogClose({ ...props }: AlertDialogPrimitive.Close.Props)
```

No portable `AlertDialogAction` — the "confirm" button is the existing form's own submit button (see below), not a separate primitive, since it has to carry `pending` state from `useFormStatus()`.

**2. `ActionButton` gains one prop, alongside the existing `confirm`** (`components/forms/action-button.tsx`):

```ts
{
  // ...existing props
  /** Text for a confirmation prompt; omit for actions that need none. */
  confirm?: string
  /** Title for the confirmation dialog. Required whenever `confirm` is set. */
  confirmTitle?: string
}
```

Internally, `confirm`/`confirmTitle` set becomes an `AlertDialog` wrapping the existing `<form>`, controlled (`open`/`onOpenChange`) instead of the current `onSubmit` + `window.confirm()` guard. The dialog's own submit button is the same `<Submit>` the form already renders, so `pending` → `tc('saving')` keeps working unchanged; the dialog only closes on cancel or once the action completes (redirect unmounts it).

**3. One new message key** under the existing `common` namespace:

| Key | Used by |
| --- | --- |
| `confirmDeleteTitle` | `AlertDialogTitle` in the delete-credit confirmation (`credits/[id]/page.tsx`) |

---

## Implementation plan

1. Add `cursor-pointer` and `disabled:cursor-not-allowed` to `buttonVariants` in `components/ui/button.tsx`. Test: `pnpm dev`, hover any button in the app (record payment, delete credit, sign out, save, cancel, etc.) — pointer cursor shows; hover a disabled button — not-allowed cursor shows.
2. Create `components/ui/alert-dialog.tsx` wrapping `@base-ui/react/alert-dialog`, styled from `components/ui/dialog.tsx`'s tokens. Nothing consumes it yet. Test: `pnpm typecheck && pnpm lint`.
3. Add `confirmDeleteTitle` to `messages/es.json` + `messages/en.json`. Test: both files parse and have identical key shape.
4. Rewire `ActionButton`'s `confirm` handling in `components/forms/action-button.tsx`: replace the `onSubmit` + `window.confirm()` guard with an `AlertDialog` (open state in local `useState`) wrapping the existing `<form>`; add the `confirmTitle` prop; the dialog's confirm button is the existing `<Submit>`, its cancel button is a plain `AlertDialogClose`. Give the `<form>` an `id` and the confirm button an explicit `form={id}` attribute, since `AlertDialogContent` portals to `document.body` and would otherwise lose its implicit association with the form. When `confirm` is unset, `ActionButton` renders exactly as before (no dialog). Test: `pnpm typecheck`.
5. Pass `confirmTitle={tc('confirmDeleteTitle')}` at the delete-credit call site in `app/[locale]/credits/[id]/page.tsx`. Test: on a credit detail page, click "Eliminar" — the styled `AlertDialog` opens (no native browser alert), showing the title and the existing `confirmDelete` description; "Cancelar" closes it with no request sent; confirming shows `tc('saving')` on the dialog's button and then redirects to `/credits` with the existing `creditDeleted` toast (SPEC 03), unchanged.

Each step ships working and is independently testable; nothing is half-wired at any point.

---

## Acceptance criteria

**Cursor**

- [ ] Hovering any button in the app — including "Registrar pago", "Eliminar" on a credit, and "Cerrar sesión" — shows a pointer cursor.
- [ ] Hovering a disabled button shows a not-allowed cursor.

**Confirmation modal**

- [ ] Clicking "Eliminar" on a credit's detail page opens a styled dialog matching the app's existing dialog look (dark/light tokens, `components/ui/dialog.tsx`-consistent) — no native browser `confirm()` alert appears.
- [ ] The dialog shows the title from `common.confirmDeleteTitle` and the description from `common.confirmDelete`, with "Cancelar" and "Eliminar" actions.
- [ ] Clicking "Cancelar" (or pressing Escape, or clicking the backdrop) closes the dialog and sends no request — the credit is untouched.
- [ ] Clicking "Eliminar" in the dialog shows `tc('saving')` on that button while the action is in flight, then redirects to `/credits` and shows the existing `creditDeleted` toast.
- [ ] `ActionButton` call sites that don't pass `confirm` (deactivate collector/route/client/user, void payment) are visually and behaviorally unchanged — no dialog appears for them.

**No regressions**

- [ ] `pnpm test`, `pnpm typecheck`, and `pnpm lint` all pass.
- [ ] `pnpm build && pnpm start` serves the credit detail page and the app shell (for logout) with no hydration error.
- [ ] Both locales (`es`, `en`) show translated dialog text, never a raw message key.

---

## Decisions

- **Yes:** fix cursor globally in `buttonVariants` (`components/ui/button.tsx`) rather than only the three call sites named in the request. Every button in the app goes through this one component, so a single-line fix at the base class covers the named cases and every other button for free, with no per-call-site risk of missing one.
- **No:** touching `Select`/`Combobox` triggers in the same pass. They're separately styled (not through `buttonVariants`) and weren't part of the original complaint — a follow-up spec if it becomes a problem.
- **Yes:** `@base-ui/react`'s `AlertDialog` primitive (already installed, zero new dependencies) over a new library. Matches the exact pattern this repo already follows for `Dialog`, `Toast`, `Select`, and `Combobox` — all thin `components/ui/*` wrappers over the same package (see SPEC 03's identical reasoning for Toast over Sonner).
- **Yes:** rewire `ActionButton`'s existing generic `confirm` prop rather than building a one-off component for delete-credit. It's the only mechanism in the codebase for a confirm-then-submit button; upgrading it in place means any future `confirm=` caller gets the modal for free, matching how SPEC 03 added `toastMessage` to the same component instead of duplicating completion-detection logic per call site.
- **Yes:** the dialog's confirm button is the form's own `<Submit>` (carrying `useFormStatus().pending`), not a separate `AlertDialogAction` that fires-and-closes immediately. Deleting a credit is a real network round trip; closing the dialog before it resolves would hide whether it actually worked, with nothing else on screen showing pending state.
- **No:** extending `confirm`/`confirmTitle` to other `ActionButton` call sites (deactivate/void flows) in this spec. Not requested, and those are reversible one-click toggles rather than a delete — adding friction there is a separate product decision.
- **Yes:** a single `confirmDeleteTitle` message key, credit-delete-specific text, rather than a generic "Confirm action" title reused everywhere. There's exactly one caller today; a generic title can be introduced when a second caller actually needs one.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `AlertDialogContent` renders through a portal to `document.body`, so once the confirm button lives inside it, it is no longer a DOM descendant of `ActionButton`'s `<form>` — an implicit `<button type="submit">` association breaks across a portal boundary. | Give the `<form>` an `id` and the confirm button an explicit `form={id}` attribute, so submission stays wired regardless of where the button renders in the DOM. Step 4's typecheck plus the manual delete-credit test in step 5 (does clicking confirm actually submit?) catch this immediately if missed. |
| `ActionButton` is reused across several one-click actions (toggle active/inactive, void payment) that don't set `confirm` — the refactor touches shared code all of them run through. | Step 4 keeps the "no `confirm` set → render exactly as before, no dialog" branch explicit; acceptance criteria call out these unchanged call sites by name. |

---

## What is **not** in this spec

- Cursor fixes for `Select`/`Combobox` triggers or any other clickable control that doesn't go through the shared `Button` component.
- Adding a confirmation step to any `ActionButton` flow beyond delete-credit (deactivate/void actions stay one-click).
- Any change to `deleteCredit`'s server logic, its redirect target, or its `creditDeleted` toast.
- Visual redesign of `Button` beyond the cursor property.

Each one, if it lands, goes in its own spec.
