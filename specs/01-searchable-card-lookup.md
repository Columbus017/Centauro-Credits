# SPEC 01 — Searchable card-number and client lookup

> **Status:** Draft
> **Depends on:** —
> **Date:** 2026-08-17
> **Objective:** Replace the blind Base UI Select typeahead with a searchable combobox on every long option list, so the operator sees what they are typing when looking up a card number or a client.

---

## Why this spec exists

The **No. de tarjeta** field in *Ingreso diario* (`components/daily-close-form.tsx:165`) is a `SelectField`, which renders a Base UI `Select`. That component has typeahead — typing moves the highlight to a matching option — but it renders the query nowhere. The operator types a card number and watches the list jump with no feedback about what was typed or why something matched. That invisibility is the reported defect.

The same `SelectField` backs the Cliente pickers on the credit forms, which carry thousands of options and have the identical problem.

A second, quieter defect sits in the same field: an untouched row falls back to `ownCredits[0]` (`components/daily-close-form.tsx:106`), so a distracted operator can post a payment against the alphabetically-first credit without ever touching the control.

---

## Scope

**In:**

- A new `components/ui/combobox.tsx` primitive wrapping `@base-ui/react/combobox`, styled to match the existing `components/ui/select.tsx`.
- `SelectField` renders the searchable variant automatically when it is given **more than 12 options**, and the current plain `Select` at or below that count. No call site passes a flag.
- `SelectOption` gains an optional secondary line, so a credit renders as the card number in `font-mono` above the client's name in muted text.
- A new tested module for matching: case-insensitive, accent-insensitive, substring (not prefix), over both lines of the option.
- Searchable fields start **empty with a placeholder** instead of pre-selecting `options[0]`.
- Typed text matching nothing clears on blur and leaves the field unselected.
- An unselected credit row in *Ingreso diario* is a validation error on both the client and in `submitDailyClose`.
- New keys in `messages/es.json` and `messages/en.json` for the placeholder, the empty-results line, and the new error.

**Out of scope (for future specs):**

- The selects at or below the threshold — Rol (2), Estado in `components/list-filters.tsx` (3–4), Cobrador (a handful). They keep today's behaviour, including the `options[0]` default.
- `components/record-payment-dialog.tsx` — it has no lookup field; it takes its credit from the row it was opened on.
- Server-side or paged option loading. Every option set stays fully client-loaded, as it is today.
- List virtualization. The largest set is active customers; if that becomes slow, it gets its own spec.
- Any change to ledger arithmetic, the duplicate-close rule, or `syncCredit()`.
- The field-collector screens under `app/[locale]/field/`.

### Call-site survey

| Call site | Field | Real-world size | Searchable |
| --- | --- | --- | --- |
| `components/daily-close-form.tsx:165` | No. de tarjeta (credits) | ~351 active | yes |
| `components/forms/credit-form.tsx:169` | Cliente | thousands | yes |
| `components/credit-history-form.tsx:238` | Cliente | thousands | yes |
| `components/forms/customer-form.tsx:182,192` | Ruta, Comercio | tens | yes |
| `components/daily-close-form.tsx:126` | Cobrador | a handful | no |
| `components/forms/credit-form.tsx:178` | Cobrador | a handful | no |
| `components/credit-history-form.tsx:241` | Cobrador | a handful | no |
| `components/forms/route-form.tsx:109` | Cobrador | a handful | no |
| `components/reports/report-form.tsx:82` | Cobrador | a handful | no |
| `components/new-user-dialog.tsx:158` | Cobrador vinculado | a handful | no |
| `components/new-user-dialog.tsx:144` | Rol | 2 | no |
| `components/list-filters.tsx:110` | Estado | 3–4 | no |

---

## Data model

No database change. Three structures in the app layer change, plus one new module.

**1. `SelectOption` gains a second line** (`components/select-field.tsx`):

```ts
export type SelectOption = {
  value: string
  label: string
  /** Second line under `label`. The searchable variant stacks it; the plain
   *  Select joins it as `label · detail` on one line. Both are searched. */
  detail?: string
}
```

**2. The daily-close credit options stop pre-joining their label** (`app/[locale]/daily-close/page.tsx`):

```ts
// was: label: `${credit.code} · ${credit.customerName}`
const credits = live.map((credit) => ({
  value: String(credit.id),
  label: credit.code,          // mono, primary line
  detail: credit.customerName, // muted, secondary line
  collectorId: String(credit.collectorId),
}))
```

**3. `PaymentDraft.creditId === ''` now means unselected** (`components/daily-close-form.tsx`). The `ownCredits[0]?.value` substitution at `components/daily-close-form.tsx:106` is removed; rows with no credit are still filtered out of `paymentsJson`, and the client blocks submit instead of silently dropping them.

**4. New module `lib/option-search.ts`**, with `lib/option-search.test.ts`:

```ts
/** Lowercase, strip diacritics (NFD + combining-mark removal), collapse spaces. */
export function normalizeForSearch(value: string): string

/** Whitespace-split query; every term must appear in `label` or `detail`. */
export function filterOptions<T extends SelectOption>(options: T[], query: string): T[]
```

Conventions:

- Matching is **substring**, not prefix — `047` finds card `1047`.
- Multi-term ANDs across both lines, so `perez 104` finds `1047 · Juan Pérez`. This mirrors how `searchTerms()` in `lib/pagination.ts` already ANDs terms for the SQL-side credit search, so the combobox and the credits list behave the same way.
- Empty query returns every option unfiltered.

**New message keys** (`messages/es.json`, `messages/en.json`):

| Key | es | en |
| --- | --- | --- |
| `common.selectPlaceholder` | `Seleccione…` | `Select…` |
| `common.searchOption` | `Buscar…` | `Search…` |
| `common.noResults` | `Sin coincidencias.` | `No matches.` |
| `errors.creditRequired` | `Seleccione el crédito de cada pago.` | `Select the credit for every payment.` |

---

## Implementation plan

1. **Create `lib/option-search.ts`** with `normalizeForSearch()` and `filterOptions()`, plus `lib/option-search.test.ts` covering: accents (`perez` → `Pérez`), substring (`047` → `1047`), multi-term AND, empty query returns all, and matching on `detail` alone. Nothing imports it yet. Test: `pnpm test`.

2. **Create `components/ui/combobox.tsx`** over `@base-ui/react/combobox`, styled from `components/ui/select.tsx` so the trigger, popup, and item states are visually identical. Must support `name` for native form submission, since server actions read the value from `FormData`. Not wired to anything. Test: `pnpm typecheck && pnpm lint`.

3. **Add the four message keys** to `messages/es.json` and `messages/en.json`. Test: both files parse and have identical key shape.

4. **Add `detail` to `SelectOption`** and render it in the plain Select as `label · detail`. No call site sets it yet, so every screen renders exactly as before. Test: load `/credits/new` and `/daily-close`, confirm no visual change.

5. **Create `components/searchable-select.tsx`** — a Client Component over the step-2 primitive: filters with `filterOptions()`, renders the two-line item (`label` in `font-mono`, `detail` muted beneath), shows `common.selectPlaceholder` when unselected, `common.noResults` when nothing matches, and clears typed text on blur when nothing was picked. Not yet reachable from any page. Test: `pnpm typecheck`.

6. **Wire the threshold into `SelectField`** — more than 12 options renders `SearchableSelect`, otherwise today's `Select`. `SelectField` stays a Server Component rendering a Client child, and `onValueChange` keeps its conditional-forwarding guard. Test: `/clients/new` (Ruta, Comercio) and `/credits/new` (Cliente) now search; `/reports` (Cobrador) and the Rol select in the user dialog are unchanged.

7. **Split the daily-close credit options** in `app/[locale]/daily-close/page.tsx` into `label: credit.code` and `detail: credit.customerName`. Test: the *No. de tarjeta* field shows the card number in mono with the client beneath, and typing `047` finds `1047` with the query visible in the input.

8. **Make an unselected row genuinely unselected** in `components/daily-close-form.tsx` — drop the `ownCredits[0]?.value` substitution, and block submit with `errors.creditRequired` when any row has an amount but no credit. Test: enter an amount, leave the credit empty, submit; the form refuses and names the field.

9. **Enforce it server-side** in `submitDailyClose` (`lib/actions/credits.ts`) — reject a payment whose `creditId` is missing with `ActionError('creditRequired')`. Test: post the form with a payments array containing a null credit; the action returns the key rather than throwing a Prisma error.

Two notes on the plan:

- **Step 2 will exceed the 30–50 line guideline.** A combobox primitive with trigger, input, popup, list, item, and empty state runs closer to 120 lines. Splitting it would produce two non-functional halves, which is worse. It stays one step.
- **Step 6 is the behavioural blast radius.** It is the point where Cliente on the credit forms stops pre-selecting the alphabetically-first customer. `creditSchema` already validates `customerId` as a required `foreignKey`, so an empty submit surfaces a proper field error rather than silently writing — but that path is worth exercising by hand at step 6, not assuming.

---

## Acceptance criteria

**The reported defect**

- [ ] In *Ingreso diario*, clicking the **No. de tarjeta** field opens a text input, and every character typed is visible in it.
- [ ] Typing `047` narrows the list to card `1047`; the input still reads `047`.
- [ ] Typing `perez` (no accent) matches a client named `Pérez`.
- [ ] Typing `perez 104` matches `1047 · Juan Pérez` and excludes `1050 · Ana Pérez`.
- [ ] Each option shows the card number in `font-mono` on the first line and the client's name muted beneath it.

**Threshold**

- [ ] Ruta and Comercio on `/clients/new` render a search input.
- [ ] Cliente on `/credits/new` renders a search input.
- [ ] Cobrador on `/reports`, Rol in the new-user dialog, and Estado in the credits list filter render today's plain dropdown, with no search input.
- [ ] A collector with 5 active credits still shows the client name on each *No. de tarjeta* option, as `1047 · Juan Pérez` on one line.

**Defaults and validation**

- [ ] A fresh *Ingreso diario* row shows `Seleccione…`, not the first credit in the list.
- [ ] Typing `9999`, which matches nothing, shows `Sin coincidencias.`; clicking away empties the input and leaves the field unselected.
- [ ] Entering an amount with no credit selected and submitting shows `Seleccione el crédito de cada pago.` and writes nothing to the database.
- [ ] Posting the same form directly to `submitDailyClose` with a payment missing its `creditId` returns the `creditRequired` key, not a Prisma error.
- [ ] A valid close with two payments still saves, and the *Ingresos registrados* table shows the new row with the same `Efectivo` figure the form displayed.

**No regressions**

- [ ] `pnpm test`, `pnpm typecheck`, and `pnpm lint` all pass.
- [ ] `pnpm build && pnpm start` serves `/daily-close` and `/credits/new` without an Auth.js or hydration error.
- [ ] Both locales render every new string: `/daily-close` and `/en/daily-close` show no raw message key.
- [ ] Submitting `/credits/new` with Cliente left empty shows a field error rather than creating a credit against the alphabetically-first customer.

The `pnpm build && pnpm start` line is deliberate rather than boilerplate: `CLAUDE.md` notes dev mode hides the `trustHost` and production-render class of failure, and this spec adds a Client Component boundary inside a Server Component that dev mode is forgiving about.

---

## Decisions

- **Yes:** a searchable combobox. The Base UI `Select` has typeahead, but it renders the query nowhere — the operator types a card number and watches the highlight jump with no feedback. That invisibility *is* the reported bug.
- **No:** keeping the Select and adding a visible "typing" indicator in the trigger. Cheaper, but it shows what was typed without showing why it matched, and it leaves the operator unable to correct a mistyped digit.
- **No:** a plain text input for the card number with a resolved-name line beside it, closest to legacy `newIncome.php`. Rejected because the legacy form posted whatever string it was given as `_idCredit`; the current form names a real credit, and that guarantee is worth keeping.
- **Yes:** an automatic threshold of 12 options inside `SelectField`, rather than an explicit `searchable` prop. A prop leaves the next long list someone adds born broken; the threshold makes the improvement structural.
- **No:** making all twelve call sites searchable. A search box over `admin` / `collector` is a regression, not a fix.
- **Yes:** `label · detail` joined on one line in the plain variant. Without it, a collector with fewer than 12 active credits falls below the threshold and the card-number option loses the client's name — the threshold must change how an option is found, never what it says.
- **Yes:** substring matching, not prefix. Operators read partial numbers off worn paper cards, and `047` should find `1047`.
- **Yes:** accent-insensitive. Guatemalan client names carry accents that operators do not type.
- **Yes:** multi-term AND across both lines, mirroring `searchTerms()` in `lib/pagination.ts`. The combobox and the credits list search should not disagree about what a query means.
- **Yes:** the matcher is a pure module in `lib/` with Vitest coverage, not a helper inside the component. It is the only part of this spec with real edge cases, and `lib/**/*.test.ts` is where this repo already keeps testable logic.
- **Yes:** searchable fields start empty. A pre-filled searchable box you must clear before typing is the worse of both worlds.
- **No:** changing the `options[0]` default on the sub-threshold selects too. Correct in principle, but it converts a UI fix into a form-semantics migration across nine call sites. Its own spec, if ever.
- **Yes:** an unselected credit row is a validation error, enforced on both client and server. Silently posting a payment against the alphabetically-first credit is a ledger error, and `syncCredit()` makes unwinding one expensive.
- **No:** async or paged option loading. The largest set is active customers and it already loads fully today; adding a server round-trip per keystroke would be new complexity solving a problem nobody has reported.
- **No:** list virtualization, for the same reason. Revisit only if a real book makes the popup slow.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `SelectField` is a Server Component and the searchable variant must be a Client Component. Forwarding a handler across that boundary unconditionally breaks every server-rendered page that uses a select — a failure this repo has already hit. | Keep the existing conditional-forwarding guard on `onValueChange` verbatim. Step 6 verifies `/reports` and `/clients/new`, which render selects from the server. |
| Base UI's `Combobox` posts its value differently from `Select`. If `name` does not reach `FormData`, server actions receive nothing and the failure is silent — the form appears to save. | Step 2 makes `name` support a requirement of the primitive, and an acceptance criterion saves a real close and checks the row appears with the right `Efectivo`. |
| The threshold flips a field's UI as data grows. A Ruta list crossing 12 rows gains a search box with no code change, which can read as a regression to whoever notices. | Intentional, and recorded in Decisions. The `label · detail` join guarantees the option text is identical on both sides of the threshold, so only the finding changes, never the content. |
| Cliente on the credit forms stops pre-selecting a customer. Anyone who relied on that default now hits a required-field error. | That default was the same silent-wrong-row hazard as the daily-close one. Step 6 exercises the path by hand and an acceptance criterion covers it. |
| `@base-ui/react`'s combobox is newer API surface than its select, so a minor upgrade is likelier to move under it. | All of it is confined to `components/ui/combobox.tsx`. The matching logic — the part with actual edge cases — lives in `lib/option-search.ts` and is dependency-free and unit-tested. |

---

## What is **not** in this spec

- The selects at or below the 12-option threshold: Rol, Estado, Cobrador. They keep today's behaviour, including the `options[0]` default.
- `components/record-payment-dialog.tsx` — no lookup field; it takes its credit from the row it opens on.
- Server-side, paged, or async option loading.
- List virtualization.
- Any change to ledger arithmetic, the duplicate-close rule, or `syncCredit()`.
- The field-collector screens under `app/[locale]/field/`.

Each one, if it lands, goes in its own spec.
