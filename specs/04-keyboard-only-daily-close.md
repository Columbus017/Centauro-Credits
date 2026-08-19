# SPEC 04 — Keyboard-only ingreso diario

> **Status:** Implemented
> **Depends on:** —
> **Date:** 2026-08-18
> **Objective:** Make the daily-close ("ingreso diario") entry form fully completable via keyboard alone, primarily by having Enter in a payment row's amount field add the next row instead of prematurely submitting the form, with matching focus management on row add/remove, collector change, and validation errors.

---

## Scope

**In:**

- In the payments repeater (`components/daily-close-form.tsx`), pressing Enter in a row's amount field adds a new payment row — same effect as clicking "Agregar pago" — and focuses the new row's credit field, instead of submitting the form.
- Pressing Enter anywhere in the form no longer triggers an implicit submit. Only activating the "Guardar" button (click, or Tab + Enter/Space on it) submits. This covers the amount field (superseded by "add a row" above), and the Base/Desembolsado/Sobrante fields (Enter is simply swallowed there — no side effect).
- Selecting a credit from a row's searchable combobox (Enter on the highlighted match) auto-advances focus to that same row's amount field.
- Removing a payment row (the trash button) sends focus to a sensible neighbor: the amount field one position up in the resulting list (or the new first row, if the removed row was first).
- Changing the collector — which today silently resets the payment rows to one blank row — focuses the new blank row's credit field, the same way adding a row already does.
- On a failed submit, focus jumps to the first actionable broken field:
  - Client-side: the first row missing a credit (today's `creditRequired` banner check).
  - Server-side: whichever of `collectorId`, `closeDate`, `base`, `disbursed`, `surplus` comes back in `state.fieldErrors`, in that form order.

**Out of scope (for future specs):**

- The close-history table below the form, the app nav, and the login page — already keyboard-reachable via plain links/inputs, no known issue.
- Server-side errors with no single owning field (`duplicateClose`, `creditNotOnRound`, malformed `payments` JSON) — these stay banner-only, as today; there's no one input to send focus to.
- Any new keyboard shortcut beyond the above (e.g. a shortcut to remove a row without visiting its trash button, reordering rows).
- Any change to `lib/ledger.ts`, `submitDailyClose`'s validation rules, or the daily-close cash formula — focus/keyboard behavior only, not business logic.
- Visual redesign of focus rings/styling — relies on the existing Base UI / Tailwind `focus-visible` treatment.

---

## Data model

No database change, no new message keys. This is ref plumbing for imperative `.focus()` calls; the form already tracks the data it needs.

**1. `SelectField` and `SearchableSelect` gain ref forwarding to their focusable control** — today both are plain function components with no `ref` parameter, so a caller's ref is silently dropped:

```ts
// components/select-field.tsx
function SelectField({ ...existingProps, ref }: { ...; ref?: React.Ref<HTMLElement> }) { ... }
// forwards to SelectTrigger (plain case) or down into SearchableSelect (searchable case)

// components/searchable-select.tsx
function SearchableSelect({ ...existingProps, ref }: { ...; ref?: React.Ref<HTMLInputElement> }) { ... }
// forwards to ComboboxInput
```

**2. `components/daily-close-form.tsx` gains two per-row ref maps**, keyed by the same `payment.key` the rows already use, plus a handful of single refs:

```ts
const creditFieldRefs = useRef(new Map<number, HTMLElement>())
const amountInputRefs = useRef(new Map<number, HTMLInputElement>())

const collectorFieldRef = useRef<HTMLElement>(null)
const closeDateRef = useRef<HTMLInputElement>(null)
const baseRef = useRef<HTMLInputElement>(null)
const disbursedRef = useRef<HTMLInputElement>(null)
const surplusRef = useRef<HTMLInputElement>(null)
```

No new component, no new prop on `DailyCloseForm` itself — these are internal to the client component.

---

## Implementation plan

1. Add ref-forwarding to `SelectField` and `SearchableSelect`, down to `SelectTrigger`/`ComboboxInput` respectively. Nothing calls it yet. Test: `pnpm typecheck && pnpm lint`.
2. Wire `collectorFieldRef`, `closeDateRef`, `baseRef`, `disbursedRef`, `surplusRef` onto their existing controls in `daily-close-form.tsx`. Nothing reads them yet. Test: `pnpm typecheck`.
3. Add the two per-row ref maps (`creditFieldRefs`, `amountInputRefs`) with a ref-callback that populates/cleans them as rows mount/unmount. Test: `pnpm typecheck`; manually add/remove a few rows, confirm no console warnings.
4. Enter in a row's amount field adds a new row: `preventDefault()` + call the existing `addPayment()`. Test: tab to an amount field, press Enter, confirm a new row appears and is focused — same as clicking "Agregar pago".
5. Enter in Base/Desembolsado/Sobrante is swallowed (`preventDefault()`, no other effect) instead of submitting. Test: type in Base, press Enter, confirm nothing submits.
6. Selecting a credit (`onValueChange`) focuses that row's amount field via `amountInputRefs`. Test: pick a credit by keyboard, confirm focus lands in the amount field.
7. Removing a row focuses the amount field at `max(0, removedIndex - 1)` in the post-removal list. Test: remove a middle row, confirm focus lands one row up.
8. Changing collector sets `focusKey` to the new blank row's key (mirrors what `addPayment` already does), instead of leaving focus unmanaged. Test: with 2+ rows, change collector, confirm the new blank row's credit field is focused.
9. Client-side "missing credit" check also focuses the first offending row's credit field, alongside today's banner. Test: type an amount, skip the credit, submit via the Guardar button, confirm focus lands on that row's credit field.
10. A `useEffect` on `state.fieldErrors` focuses the first of `collectorId` / `closeDate` / `base` / `disbursed` / `surplus` (in form order) that has an error after a failed server round-trip. Test: submit with an invalid date, confirm focus lands on the date field once the page updates.

Each step ships working and is independently testable; nothing is half-wired at any point.

---

## Acceptance criteria

**Core keyboard behavior**

- [x] Pressing Enter in any payment row's amount field adds a new payment row and moves focus to its credit field, without submitting the form.
- [x] Pressing Enter in Base, Desembolsado, or Sobrante does not submit the form and has no other visible effect.
- [x] Selecting a credit from a row's combobox via keyboard moves focus to that row's amount field.
- [x] Removing a payment row via its trash button moves focus to the amount field one position up in the resulting list (or the new first row, if the removed row was first).
- [x] Changing the collector focuses the credit field of the resulting single blank payment row.

**Error focus**

- [x] Submitting with a row that has an amount but no selected credit shows the existing banner and moves focus to that row's credit field.
- [x] Submitting with a server-rejected `collectorId`, `closeDate`, `base`, `disbursed`, or `surplus` moves focus to the first such field, in that form order, once the page updates after the round trip.

**End-to-end**

- [x] Tabbing from the form's first control through Collector → Date → each payment row → "Agregar pago" → Base → Desembolsado → Sobrante → Guardar reaches every control exactly once, with no control skipped and no keyboard trap.
- [x] The full flow — pick collector, set date, add three payments naming different credits, set base/disbursed/surplus, submit — completes start to finish using only Tab, Shift+Tab, arrow keys, typing, and Enter/Space, without touching the mouse.

**No regressions**

- [x] `pnpm test`, `pnpm typecheck`, and `pnpm lint` all pass.
- [x] `pnpm build && pnpm start` serves `/daily-close` with no hydration error.
- [x] Mouse-driven use (clicking "Agregar pago", clicking a select option, clicking Guardar) still works exactly as before.

---

## Decisions

- **Yes:** Enter in a payment row's amount field adds a new row, mirroring the existing "Agregar pago" button, rather than just moving focus like Tab. This is the exact spot where the mouse gets reached for today — matching a behavior the operator already understands beats inventing a new one.
- **No:** Enter-in-amount as a plain Tab-equivalent. Doesn't address the actual friction; still requires a separate action to add a row.
- **Yes:** block implicit Enter-submit everywhere; only the "Guardar" button submits. A daily close has no edit/void path once saved (a same-day resubmit is rejected outright as `duplicateClose`), so an accidental early submit is expensive to undo.
- **Yes:** selecting a credit auto-advances focus to that row's amount field. Cuts one Tab per payment row, directly serving the stated goal of entry speed.
- **Yes:** `SelectField`/`SearchableSelect` gain ref forwarding, rather than reaching for `document.getElementById`/`activeElement`. Refs are the idiomatic way to reach an imperatively-focusable child component; these are the only two call sites in the repo that need it, so nothing else is affected.
- **Yes:** row-removal focus targets `max(0, removedIndex - 1)` with no "focus the Add button" fallback. The trash button is already `disabled` at one remaining row, so removing down to zero is unreachable — the fallback would be dead code.
- **No:** a keyboard shortcut to remove a row without visiting its trash button, or to reorder rows. Not the described pain point; Tab + Enter on the existing button is enough.
- **No:** any change to focus-ring/visual styling. Reachability and tab/Enter behavior only — the existing Base UI `focus-visible` treatment is untouched.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Base UI's `Combobox.Input`/`Select.Trigger` may not forward a plain DOM ref cleanly through this wrapper's extra layers (`ComboboxInputGroup`, the portal-rendered popup), making the credit-field ref useless for imperative focus. | Step 1 is isolated and typechecked before any consumer relies on it; steps 6 and 9's manual tests are the real proof — a broken ref surfaces immediately as "focus doesn't move," not silently. |
| Client-side (`missingCredit`) and server-side (`state.fieldErrors`) focus management run through two separate code paths — `onSubmit` vs. a `useEffect` on `state` — that could in principle fire together and fight over focus. | They can't overlap in practice: the client-side check calls `preventDefault()`, so the server action never runs and `state` never changes — the effect only ever fires after a real round trip. |

---

## What is **not** in this spec

- The close-history table, app nav, and login page.
- Banner-only server errors with no single owning field (`duplicateClose`, `creditNotOnRound`, malformed `payments`).
- New keyboard shortcuts beyond Enter-adds-row and blocked implicit submit (no row-remove shortcut, no reordering).
- Any change to `lib/ledger.ts`, `submitDailyClose`'s validation, or the cash formula.
- Focus-ring or other visual styling changes.

Each one, if it lands, goes in its own spec.
