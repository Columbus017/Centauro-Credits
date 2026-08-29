# SPEC 06 — Enter-submit fix and inline new-credit modal in ingreso diario

> **Status:** Approved
> **Depends on:** SPEC 04 (keyboard-only ingreso diario)
> **Date:** 2026-08-28
> **Objective:** Stop the credit-search field in ingreso diario from submitting the daily close when Enter is pressed with no matching card, and let an admin create a brand-new credit — for an existing client, under the collector already selected — from a modal inside that same screen, without leaving it or losing the payments already entered.

---

## Scope

**In:**

- `components/ui/combobox.tsx`: `ComboboxInput` swallows the native default action on Enter (`event.preventDefault()`), regardless of whether Base UI already selected a highlighted match. Fixes the credit-search field in ingreso diario, and — for free, same reasoning SPEC 05 used for `buttonVariants`'s cursor fix — every other searchable combobox in the app that sits inside a `<form>` with a submit button (`/credits/new`'s client picker, `credit-history-form.tsx`, `report-form.tsx`, etc.).
- `components/searchable-select.tsx`: gains one optional prop pair (working name `emptyAction` / `onEmptyAction`) rendered inside `ComboboxEmpty` when there are no matches — a small "Crear nuevo crédito «query»" button, scoped generically enough for any future "create new X" caller but only ever passed by `daily-close-form.tsx` today. Omitted, the empty state renders exactly as it does now (`common.noResults`, no button).
- `components/select-field.tsx`: passes the new prop through to `SearchableSelect` when it picks that branch, the same way it already forwards `onValueChange`.
- `lib/actions/credits.ts`: the transactional insert inside `createCredit` (credit + origination ledger row) is extracted into a shared helper. `createCredit` keeps its existing signature, `requireAdmin()`, and redirect — unchanged for `/credits/new` and `/credits/[id]/edit`. A new `createCreditInline` action calls the same helper, also behind `requireAdmin()`, but returns `{ ok: true, credit: {...} }` instead of redirecting.
- `app/[locale]/daily-close/page.tsx`: fetches `customerOptions()` and `DEFAULT_INTEREST_RATE` (same two extra pieces `/credits/new` already fetches) and passes them to `DailyCloseForm`.
- New `components/new-credit-dialog.tsx`: the modal — same field set as `CreditForm`'s create mode (código, fecha de entrega, capital, total a pagar calculado, cliente, cobrador), submitting through `createCreditInline`. The cobrador field is fixed to the collector already selected in the daily-close form (read-only, not a picker) — see Decisions.
- `components/daily-close-form.tsx`:
  - A "+ Nuevo crédito" button next to "Agregar pago", opening the modal untied to any row.
  - Each row's credit `SearchableSelect` passes `onEmptyAction`, prefilling the modal's código with the row's current search text and opening the modal tied to that row.
  - On successful creation: the new credit is merged into local state and auto-selected — into the triggering row if one exists, otherwise into an existing empty row if one exists, otherwise into a newly added row — with focus moving to that row's amount field, matching SPEC 04's existing focus choreography.
- New message keys under `dailyClose` (title, description, field labels reusing `credits.form.*` where identical) + one `common.noResults`-adjacent key for the empty-state button, in both `messages/es.json` and `messages/en.json`.

**Out of scope (for future specs):**

- Any change to `createCredit`'s existing behavior, redirect target, or the standalone `/credits/new` / `/credits/[id]/edit` pages — they keep using the extracted helper but nothing about their own contract changes.
- Creating a brand-new client from inside this modal. `customerId` stays a required foreign key to an existing client, same rule `/credits/new` already enforces.
- Letting the modal's cobrador be freely chosen — it is always the collector already selected at the top of the ingreso diario form.
- Any other searchable combobox in the app gaining a "create new" empty-state action — only the credit picker in ingreso diario gets `onEmptyAction` wired; the prop exists generically on `SearchableSelect` but is otherwise unused.
- Any change to `lib/ledger.ts`, credit validation rules, or the payoff-total formula (`principal × 1.15`) — this spec only adds a second entry point to the existing, unchanged creation logic.
- Row-removal, collector-change, or error-focus behavior already covered by SPEC 04 — untouched except for the one new "auto-select the created credit" focus case, which follows the same pattern.

---

## Data model

No database change — same `Credit` + origination `LedgerEntry` shape `createCredit` already writes. Everything below is UI plumbing plus one new server action sharing the existing transaction.

**1. `components/ui/combobox.tsx` — `ComboboxInput`, behavior only, no new props:**

```ts
function ComboboxInput({ className, onKeyDown, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      onKeyDown={(event) => {
        onKeyDown?.(event)
        // Base UI only preventDefaults Enter when it has a highlighted match to
        // select; with none, Enter falls through to the browser's implicit
        // submit of the enclosing form's submit button. A search box must
        // never do that — calling preventDefault a second time when Base UI
        // already selected something is a no-op, so this is safe either way.
        if (event.key === 'Enter') event.preventDefault()
      }}
      className={cn(...)}
      {...props}
    />
  )
}
```

**2. `components/searchable-select.tsx` — one new prop pair, paired like `confirm`/`confirmTitle` in SPEC 05:**

```ts
export function SearchableSelect({
  // ...existing props
  /** Label for a button shown in the empty state instead of the plain "no results" text. Requires `onEmptyAction`. */
  emptyActionLabel,
  /** Called with the current search query when the empty-state button is activated. */
  onEmptyAction,
}: {
  // ...existing props
  emptyActionLabel?: string
  onEmptyAction?: (query: string) => void
})
```

Internally, `Combobox` gains `onInputValueChange` to track the query in local state (needed to hand it to `onEmptyAction`); `ComboboxEmpty` renders the button when both props are set, the existing `t('noResults')` text otherwise — zero behavior change for every other caller (`credit-form.tsx`, `credit-history-form.tsx`, `report-form.tsx`, `list-filters.tsx`), none of which passes the new props.

**3. `components/select-field.tsx`** forwards `emptyActionLabel`/`onEmptyAction` to `SearchableSelect`, same pass-through pattern as `onValueChange`.

**4. `lib/actions/credits.ts`** — the transactional insert extracted, one new action added:

```ts
async function insertCredit(tx: Tx | typeof db, data: {
  customerId: number; collectorId: number; code: string; startDate: string; principal: number
}) {
  const totalDue = fromCents(payoffTotalCents(data.principal))
  const created = await tx.credit.create({
    data: { ...data, startDate: isoDate(data.startDate) },
    include: { customer: { select: { firstName: true, lastName: true } } },
  })
  await tx.ledgerEntry.create({
    data: { creditId: created.id, kind: 'origination', entryDate: isoDate(data.startDate), amount: totalDue, runningBalance: totalDue },
  })
  return created
}

export type CreateCreditInlineState = FormState & {
  /** Set only when `ok` — the row `daily-close-form.tsx` merges into its options and auto-selects. */
  credit?: { value: string; label: string; detail: string; collectorId: string }
}

export async function createCreditInline(
  _previous: CreateCreditInlineState,
  formData: FormData,
): Promise<CreateCreditInlineState> {
  await requireAdmin()
  const parsed = parseForm(creditSchema, formData)
  if (!parsed.ok) return parsed.state

  const created = await db.$transaction((tx) => insertCredit(tx, parsed.data))

  revalidateLedger()
  return {
    ok: true,
    credit: {
      value: String(created.id),
      label: created.code,
      detail: `${created.customer.firstName} ${created.customer.lastName}`,
      collectorId: String(created.collectorId),
    },
  }
}
```

`createCredit` keeps its own transaction wrapper but delegates the create+origination pair to `insertCredit`; its redirect and `requireAdmin()` are untouched.

**5. New `components/new-credit-dialog.tsx`** — controlled from the parent, no internal trigger (two different triggers open the same instance):

```ts
function NewCreditDialog({
  open,
  onOpenChange,
  customers,
  collectorId,
  collectorLabel,
  interestRate,
  today,
  locale,
  prefillCode,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: SelectOption[]
  /** Fixed for this dialog instance — rendered read-only, not a picker. */
  collectorId: string
  collectorLabel: string
  interestRate: number
  today: string
  locale: string
  /** Seeds the código field when opened from a row's empty-state search. */
  prefillCode: string
  onCreated: (credit: { value: string; label: string; detail: string; collectorId: string }) => void
})
```

Internally: `useActionState(createCreditInline, EMPTY_STATE)`, same "close + reset on `state.ok`, fire `onCreated` in a `useEffect`" pattern `new-user-dialog.tsx` already uses for `createUser`. Fields mirror `CreditForm`'s create mode (código, fecha de entrega, capital, total a pagar calculado live) minus the cobrador picker, replaced by a disabled/read-only field showing `collectorLabel` plus a hidden `collectorId` input.

**6. `components/daily-close-form.tsx`** additions:

```ts
const [extraCredits, setExtraCredits] = useState<typeof credits>([])
// Merged with the server-fetched `credits` prop before the collector filter —
// the prop only catches up after the page's automatic post-action refresh,
// which is not guaranteed to have landed by the time the dialog closes.

const [creditDialog, setCreditDialog] = useState<{
  open: boolean
  forRowKey: number | null // null = opened from the general "+ Nuevo crédito" button
  prefillCode: string
}>({ open: false, forRowKey: null, prefillCode: '' })

const [amountFocusKey, setAmountFocusKey] = useState<number | null>(null)
// Mirrors `focusKey`, but drives the amount field's `autoFocus` for a row that
// is created already carrying a credit — `focusKey` still owns the "operator
// asked for a blank row" case.
```

`handleCreditCreated` resolves the target row (triggering row → first empty row → a newly appended row, per the confirmed order), sets that row's `creditId`, and either calls `amountInputRefs.current.get(key)?.focus()` directly (row already mounted) or sets `amountFocusKey` (row about to mount).

**7. `app/[locale]/daily-close/page.tsx`** fetches `customerOptions()` alongside the existing `collectorOptions()`/`listCredits()`/`listDailyCloses()` calls, and passes `DEFAULT_INTEREST_RATE` (from `lib/ledger.ts`, already imported by `/credits/new`) through to `DailyCloseForm`.

**8. Message keys** (`messages/es.json` + `messages/en.json`):

| Key | Value (es) | Used by |
| --- | --- | --- |
| `dailyClose.form.newCredit` | "Nuevo crédito" | Button next to "Agregar pago"; dialog title |
| `dailyClose.form.newCreditDescription` | "Crear un crédito para un cliente existente en la cartera de {collector}." | Dialog description (interpolated) |
| `dailyClose.form.newCreditCollectorHint` | "Este crédito se crea para el cobrador seleccionado arriba." | Hint under the read-only cobrador field |
| `dailyClose.form.createCreditAction` | "Crear nuevo crédito" | Empty-state button in the credit combobox (`onEmptyAction`'s `emptyActionLabel`) |

Everything else in the dialog reuses existing keys: `credits.form.code/startDate/principal/computed/computedHint/save`, `common.client`, `tc('cancel')`, `tc('saving')`, and `toast.creditCreated` for the success toast.

---

## Implementation plan

1. `components/ui/combobox.tsx`: wrap `ComboboxInput`'s `onKeyDown` to `preventDefault()` on Enter, as in the Data model. Test: `pnpm typecheck && pnpm lint`; manually type a card number that doesn't exist into a row's "No. de tarjeta" field in ingreso diario and press Enter — the daily close no longer submits.
2. `lib/actions/credits.ts`: extract `insertCredit(tx, data)`, have `createCredit` call it inside its existing transaction. Test: `pnpm typecheck`; manually create a credit via `/credits/new` — still creates the origination row and redirects exactly as before.
3. Add `createCreditInline` + `CreateCreditInlineState` alongside it, calling `insertCredit` in its own transaction and returning `{ ok: true, credit }` instead of redirecting. Nothing calls it yet. Test: `pnpm typecheck`.
4. Add `emptyActionLabel`/`onEmptyAction` to `SearchableSelect` (query tracked via `onInputValueChange`, rendered in `ComboboxEmpty`), forwarded through `SelectField`. Nothing passes them yet. Test: `pnpm typecheck && pnpm lint`; every existing searchable select (`/credits/new`'s client picker, list filters, reports) still shows the plain "Sin coincidencias." text, unchanged.
5. Add the four new message keys (Data model, item 8) to `messages/es.json` and `messages/en.json`. Test: both files parse and have identical key shape.
6. Build `components/new-credit-dialog.tsx`: controlled `Dialog`, `useActionState(createCreditInline, EMPTY_STATE)`, fields mirroring `CreditForm`'s create mode minus the cobrador picker (read-only `collectorLabel` + hidden `collectorId` input), close-and-reset + `onCreated(state.credit)` on success. Not rendered anywhere yet. Test: `pnpm typecheck`.
7. `app/[locale]/daily-close/page.tsx`: fetch `customerOptions()` and pass `DEFAULT_INTEREST_RATE` through to `DailyCloseForm`. Test: `pnpm typecheck`; page still renders (prop is unused by `DailyCloseForm` until the next step).
8. Wire `DailyCloseForm`: `extraCredits`/`creditDialog`/`amountFocusKey` state; a "+ Nuevo crédito" button next to "Agregar pago"; each row's credit `SearchableSelect` gets `emptyActionLabel={t('createCreditAction')}` and `onEmptyAction` opening the dialog tied to that row with the typed query as `prefillCode`; render `<NewCreditDialog>` once, controlled; `handleCreditCreated` resolves the target row and focuses its amount field; `ownCredits` filters over `[...credits, ...extraCredits]`. Test: manually — click "+ Nuevo crédito", confirm it opens with no prefill and the cobrador shown matches the one selected above; type a nonexistent card in a row, click the new "Crear nuevo crédito" empty-state action, confirm the dialog opens prefilled with that text.
9. End-to-end manual pass covering every item in Acceptance criteria below, plus `pnpm build && pnpm start` smoke test of `/daily-close` and `/credits/new`.

Each step ships working and is independently testable; nothing is half-wired at any point.

---

## Acceptance criteria

**Enter-submit fix**

- [ ] In ingreso diario, typing a card number that matches no live credit into a row's "No. de tarjeta" field and pressing Enter does nothing observable — the daily close is not submitted, no new payment row is added, focus stays in the field.
- [ ] With a match highlighted in that same field, Enter still selects it and moves focus to that row's amount field (SPEC 04 behavior, unchanged).
- [ ] The same "Enter with no match does not submit" behavior holds in every other searchable combobox sitting inside a `<form>` with a submit button — `/credits/new`'s client picker is enough to spot-check.
- [ ] Pressing Enter in a row's amount field, or in Base/Desembolsado/Sobrante, still behaves exactly as SPEC 04 left it (adds a row / is swallowed).

**New-credit modal**

- [ ] A "+ Nuevo crédito" button appears next to "Agregar pago". Clicking it opens a dialog with código, fecha de entrega, capital, total a pagar calculado (live, 15%), and cliente — no cobrador picker, showing instead the collector already selected at the top of the form.
- [ ] Typing a card number with no match into a row's tarjeta field shows a "Crear nuevo crédito" action in the empty state; activating it opens the same dialog with código prefilled from what was typed, tied to that row.
- [ ] The dialog's cliente field only offers existing clients; there is no way to create a new client from inside it.
- [ ] Submitting the dialog with valid data creates the credit and its origination ledger entry (same as `/credits/new`), closes the dialog, shows the `toast.creditCreated` toast, and does **not** navigate away from `/daily-close` — every payment row already entered is untouched.
- [ ] After creation: if opened from a specific row, that row now shows the new credit selected. If opened from the general button, an existing empty row gets it if one exists, otherwise a new row is added with it selected. Either way, focus lands in that row's amount field.
- [ ] The newly created credit is immediately choosable from every row's combobox afterward (not just the auto-selected one), without a manual page reload.
- [ ] Submitting the dialog with invalid data (missing cliente, malformed capital, etc.) shows the same field errors `/credits/new` would show, and the dialog stays open.
- [ ] Closing the dialog without submitting (Cancelar, Escape, backdrop) discards whatever was typed and leaves every payment row exactly as it was.
- [ ] `/credits/new` and `/credits/[id]/edit` behave exactly as before — same fields, same redirect, same validation.

**No regressions**

- [ ] `pnpm test`, `pnpm typecheck`, and `pnpm lint` all pass.
- [ ] `pnpm build && pnpm start` serves `/daily-close` and `/credits/new` with no hydration error.
- [ ] Both locales (`es`, `en`) show translated dialog text, never a raw message key.
- [ ] A collector account cannot reach `/daily-close` or trigger `createCreditInline` — both still gate on `requireAdmin()`.

---

## Decisions

- **Yes:** fix the Enter-submit bug globally in `ComboboxInput` (`components/ui/combobox.tsx`) rather than only inside `daily-close-form.tsx`. Every searchable combobox in the app goes through this one primitive, so it is the same fix SPEC 05 already made for the cursor property — one line at the base, no risk of missing a call site, and it happens to fix the identical latent bug in `/credits/new`'s own client picker for free.
- **No:** trying to detect "no highlighted match" ourselves and only preventDefault in that case. Unconditionally calling `preventDefault()` on every Enter in this field is simpler, and harmless when Base UI already selected a match — `preventDefault()` a second time is a no-op, it does not undo the selection.
- **Yes:** extract `insertCredit` as a shared helper between `createCredit` and the new `createCreditInline`, rather than duplicating the transaction. Matches `syncCredit`'s own reasoning in this codebase almost verbatim — the legacy app copy-pasted credit-creation logic once already and it is exactly the kind of drift this project is porting away from.
- **No:** changing `createCredit` itself to optionally skip its redirect (e.g. via a flag). Two thin actions over one shared insert is more explicit than one action branching on a parameter, and keeps `/credits/new`'s contract untouched.
- **Yes:** `emptyActionLabel`/`onEmptyAction` as a generic, optional prop pair on `SearchableSelect`, mirroring how SPEC 05 added `confirm`/`confirmTitle` to `ActionButton` instead of forking a one-off component. Every other caller is unaffected since the props are only ever passed by `daily-close-form.tsx`.
- **No:** extending the empty-state "create new" action to any other searchable combobox in this pass (client pickers, filters). Not requested; the prop exists generically so a future spec can wire it up cheaply if needed.
- **Yes:** the modal's cobrador is fixed to whatever is already selected in the daily-close form, not a picker. The whole point of opening it mid-close is to add a credit to the round already being closed; asking again invites picking the wrong one.
- **No:** allowing a new client to be created from inside this modal. `customerId` stays a required existing-client foreign key, same as `/credits/new` — creating a client is a materially different, unrelated flow.
- **Yes:** keep `extraCredits` as local client state merged with the server-fetched `credits` prop, rather than relying solely on Next's automatic post-action route refresh to update `ownCredits` in time for auto-selection. The refresh is real (SPEC 03/05's dialogs lean on the same mechanism for their own lists) but its timing relative to `onCreated` firing is not something this spec should depend on for a same-interaction auto-select.
- **Yes:** reuse `toast.creditCreated` and the `credits.form.*` field labels in the dialog rather than minting parallel copies. The action being called is the same one `/credits/new` calls; the copy should say the same thing.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `preventDefault()` in `ComboboxInput`'s wrapper could, in principle, interfere with some other Base UI internal keyboard behavior on Enter that this pass didn't anticipate (e.g. multi-select chip commit, IME composition). | `preventDefault()` only suppresses the browser's native default action (form submission); it does not stop other JS handlers in the same event from running, and Base UI's own Enter logic is JS-driven, not native-default-driven. Step 1's manual test covers the one case that matters here — selecting a highlighted match still works — and `pnpm test`/`typecheck`/`lint` catch anything structurally broken. |
| `extraCredits` and the server-refreshed `credits` prop could both end up containing the same newly created credit after the automatic post-action refresh lands, rendering it twice in a row's option list. | `ownCredits` dedupes by `value` when merging `credits` and `extraCredits` (both keyed by the credit's id as a string) — the acceptance criterion "immediately choosable... without a manual reload" is satisfied by whichever copy arrives first, and the dedupe keeps the eventual convergence clean. |
| The read-only cobrador field in the modal reads from `daily-close-form.tsx`'s `collectorId` state at the moment the dialog opens; if the operator changes the top-level collector while the dialog is open, the modal could submit against a stale collector. | The daily-close collector `SelectField` isn't reachable while the modal's backdrop is up (Base UI's `Dialog` traps focus and blocks pointer events on the page behind it), so this can't happen in practice — noted here rather than defended in code. |
| Extracting `insertCredit` touches the one function `createCredit` (a page users depend on today) runs through. | Step 2 ships and is manually verified against `/credits/new` before `createCreditInline` is even added in step 3 — a regression here surfaces immediately, isolated from every later step. |

---

## What is **not** in this spec

- Any change to `createCredit`'s own behavior, redirect target, or the standalone `/credits/new` / `/credits/[id]/edit` pages.
- Creating a new client from inside the ingreso diario modal — `customerId` stays a required existing-client foreign key.
- A freely-choosable cobrador in the modal — it is always the collector already selected in the daily-close form.
- Adding the "create new" empty-state action to any other searchable combobox in the app (client pickers, list filters, report filters) — the prop exists generically on `SearchableSelect` but only ingreso diario's credit picker uses it.
- Any change to `lib/ledger.ts`, credit validation rules, or the payoff-total formula.
- Any focus/keyboard behavior SPEC 04 already covers beyond the one new "auto-select the created credit" case (row removal, collector-change reset, server-error focus, etc.).

Each one, if it lands, goes in its own spec.
