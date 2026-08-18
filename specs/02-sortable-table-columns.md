# SPEC 02 — Sortable table columns

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-08-17
> **Objective:** Add clickable ascending/descending sort to the column headers of the six admin list tables, using URL params so the order is linkable and reloadable like the existing filters.

---

## Scope

**In:**

- A `SortableHead` component (server-rendered `<Link>`, same pattern as `components/pagination.tsx`'s `PageLink`) that replaces plain `TableHead` on every sortable column across the six tables below.
- Click cycle per column: unsorted → ascending → descending → unsorted (reverts to the table's existing default order), each state a full page navigation via `?sort=` / `?dir=`.
- A muted up/down chevron pair on every sortable header, always visible — filled/highlighted in the active direction when that column is the current sort, neutral otherwise.
- Server-side ordering:
  - `/clients`, `/credits`, `/payments` (paged): `orderBy` pushed into the existing Prisma query in `lib/queries/*.ts`, alongside the existing `where`.
  - `/routes`, `/collectors`, `/admin/users` (unpaged): a JS `.sort()` over the already-fully-materialized row array, applied after today's fixed `orderBy`/derivation.
- Sorting a column resets `?page=1`, matching how `ListFilters.apply()` already drops `page` on any filter change.
- Exactly the columns in the table below — real DB columns and straightforward relation joins (`customer.firstName`, `route.name`, etc.) on the paged tables; every shown column on the unpaged tables except `Cobradores.Rutas` (a joined list of names, not a single sortable value).

| Table | Sortable | Not sortable |
| --- | --- | --- |
| Clientes | Cliente, Comercio, Ruta, Cobrador | Créditos, Saldo (ledger-derived) |
| Créditos | Código, Cliente, Cobrador, Fecha inicio, Principal | Total, Pagos, Saldo, Estado (ledger-derived) |
| Pagos | Fecha, Crédito, Cliente, Cobrador, Ruta, Monto, Saldo, Estado | — |
| Rutas | Código, Ruta, Cobrador, Clientes, Créditos, Cartera, Estado | — |
| Cobradores | Cobrador, Clientes, Créditos, Cartera, Cobrado, Estado | Rutas (joined list) |
| Usuarios | Usuario, Username, Rol, Cobrador vinculado, Última actividad, Estado | — |

**Out of scope (for future specs):**

- Sorting `Créditos.Total/Pagos/Saldo/Estado` or `Clientes.Créditos/Saldo` — these require walking `lib/ledger.ts` per credit; sorting them correctly on a paged table means pushing that derivation into SQL, which is its own spec.
- Multi-column sort (shift-click for a secondary key). Single column only.
- Date **range filtering** (a "from"/"to" pair narrowing the list) — this spec is sort direction only, not a new filter.
- Wiring up the decorative `SearchInput` on `/routes`, `/collectors`, `/admin/users` — it stays exactly as inert as it is today.
- Sub-tables on detail pages (`/credits/[id]`'s ledger, `/clients/[id]`'s credits, `/routes/[id]`, `/collectors/[id]`) and the field-collector screens (`app/[locale]/field/`).
- Any change to `lib/ledger.ts`, `syncCredit()`, or what a column's value is — only the order rows appear in.

---

## Data model

No database change. New types and a handful of query-signature additions.

**1. `lib/pagination.ts` gains the sort primitive**, next to `parsePage`/`firstParam`:

```ts
export type SortDirection = 'asc' | 'desc'
export type SortState<K extends string> = { key: K; dir: SortDirection } | null

/** `?sort=`/`?dir=` validated against a table's own key list; anything else is `null` (default order). */
export function parseSort<K extends string>(
  sortParam: string | undefined,
  dirParam: string | undefined,
  validKeys: readonly K[],
): SortState<K>
```

**2. New `components/sortable-head.tsx`** — a plain (non-async, no translations needed) function component, built the same way `PageLink` in `components/pagination.tsx` builds its links: read `searchParams`, compute the next `sort`/`dir`/cleared state, render a `<Link>` wrapping the label and a muted chevron pair, filled in the active direction when `current?.key` matches.

```ts
function SortableHead<K extends string>({
  label,
  sortKey,
  current,
  searchParams,
  align,
}: {
  label: string
  sortKey: K
  current: SortState<K>
  searchParams: Record<string, string | string[] | undefined>
  align?: 'right'
}): React.ReactElement
```

**3. Each query module declares its own sort-key list**, next to the query it orders — mirroring how `CreditListFilter`/`CustomerListFilter` already live beside their query:

```ts
// lib/queries/entities.ts
export const CUSTOMER_SORT_KEYS = ['name', 'commerce', 'route', 'collector'] as const
export type CustomerSortKey = typeof CUSTOMER_SORT_KEYS[number]

export const ROUTE_SORT_KEYS = ['code', 'name', 'collector', 'clients', 'credits', 'portfolio', 'status'] as const
export const COLLECTOR_SORT_KEYS = ['name', 'clients', 'credits', 'portfolio', 'collected', 'status'] as const
export const USER_SORT_KEYS = ['name', 'username', 'role', 'collector', 'lastActive', 'status'] as const

// lib/queries/credits.ts
export const CREDIT_SORT_KEYS = ['code', 'client', 'collector', 'startDate', 'principal'] as const

// lib/queries/payments.ts
export const PAYMENT_SORT_KEYS = ['date', 'credit', 'client', 'collector', 'route', 'amount', 'balance', 'status'] as const
```

**4. Query functions take one more argument**, `sort: SortState<TheirKey>`, appended after `page`/at the end of the paged ones and as the sole new argument on the unpaged ones (`listRoutes(sort)`, `listCollectors(sort)`, `listUsers(sort)`). Internally each maps `key` to either a Prisma `orderBy` (paged tables — pushed into the existing query alongside `where`) or a comparator applied to the already-materialized array with `Array.prototype.sort` (unpaged tables), falling back to today's fixed order when `sort` is `null`.

No new message keys — column labels reuse the existing `table.*` translations; the chevrons are icons, not text.

---

## Implementation plan

1. Add `SortDirection`, `SortState<K>`, `parseSort()` to `lib/pagination.ts`. Extend `lib/pagination.test.ts`: valid key + `dir=desc` → `{ key, dir: 'desc' }`; valid key with no `dir` → defaults to `'asc'`; unrecognized key → `null`. Test: `pnpm test`.

2. Create `components/sortable-head.tsx` with `SortableHead`. Its link-building logic cycles unsorted → `asc` → `desc` → unsorted (dropping `sort`/`dir` entirely on the third click), and always drops `page` from the query the same way `ListFilters.apply()` already does — a resorted page 12 is as broken as a refiltered one. Not wired into any page yet. Test: `pnpm typecheck && pnpm lint`.

3. Add the sort-key constants and extend `listCustomersPage`, `listCreditsPage`, `listPaymentsPage` in `lib/queries/entities.ts` / `credits.ts` / `payments.ts` with an optional fourth parameter `sort: SortState<...> = null`, pushed into the existing Prisma `orderBy` only when non-null. No call site passes it yet, so every page renders exactly as before. Test: `pnpm typecheck`.

4. Extend `listRoutes`, `listCollectors`, `listUsers` in `lib/queries/entities.ts` with an optional `sort` parameter, applied as a comparator over the materialized array before returning, only when non-null. Test: `pnpm typecheck`.

5. Wire `/clients`: parse `sort`/`dir` from `searchParams`, pass to `listCustomersPage`, swap `Cliente`/`Comercio`/`Ruta`/`Cobrador` headers for `SortableHead`. `Créditos`/`Saldo` stay plain `TableHead`. Test: sort by each column, confirm the URL and row order both change; confirm `Créditos`/`Saldo` show no chevrons.

6. Wire `/credits`: same for `Código`/`Cliente`/`Cobrador`/`Fecha inicio`/`Principal`. Test: sort `Fecha inicio` ascending and descending; confirm `Total`/`Pagos`/`Saldo`/`Estado` are unaffected and unclickable.

7. Wire `/payments`: same for all eight columns, including `Fecha` and `Saldo`. Test: sort `Fecha` ascending shows the oldest payment first; sort `Saldo` and confirm it orders by the stored `runningBalance` column, not a walked value.

8. Wire `/routes`, `/collectors`, `/admin/users`: same pattern for the unpaged pages, including the derived figures (`Cartera`, `Cobrado`, `Clientes`, `Créditos`). Test: sort `Cartera` on `/collectors` descending and confirm every collector is present and correctly ordered, not just a visible subset — there is no paging here to hide a mistake.

Note: this repo's convention (see SPEC 01) is that a step can exceed the 30–50 line guideline when splitting it would leave a non-functional half — step 2 (`SortableHead`) is likely that case, since a link-cycling header with three states and a chevron pair doesn't split cleanly.

---

## Acceptance criteria

**Core behavior**

- [ ] Clicking a sortable column header on any of the six tables navigates to a URL carrying `?sort=<key>&dir=asc`.
- [ ] Clicking the same header again flips it to `dir=desc`.
- [ ] Clicking it a third time removes `sort`/`dir` from the URL and the table returns to its original default order.
- [ ] The active column's chevron is visually distinct (filled/highlighted) in the current direction; every other sortable column shows a neutral, muted chevron pair.
- [ ] Sorting from page 2 (or later) of `/clients`, `/credits`, or `/payments` lands on page 1.

**Per table**

- [ ] `/clients`: Cliente, Comercio, Ruta, Cobrador are sortable; Créditos and Saldo render as plain headers with no chevron.
- [ ] `/credits`: Código, Cliente, Cobrador, Fecha inicio, Principal are sortable; Total, Pagos, Saldo, Estado are plain.
- [ ] `/payments`: all eight columns are sortable, including Fecha and Saldo.
- [ ] `/routes`, `/collectors`: every listed column is sortable except Cobradores' Rutas.
- [ ] `/admin/users`: Usuario, Username, Rol, Cobrador vinculado, Última actividad, Estado are all sortable.

**Correctness**

- [ ] Sorting `Fecha` ascending on `/payments` shows the oldest date first across the whole filtered set, not just the current page.
- [ ] Sorting `Cartera` descending on `/collectors` produces the same order as manually sorting the full unpaged row list — no collector is missing or out of place.
- [ ] Sorting a column and then applying a search/status/route filter keeps both active at once, expressed in the URL together.
- [ ] Reloading a URL with `sort`/`dir` already set (e.g. from a bookmark) renders already sorted, with no flash of default order.

**No regressions**

- [ ] `pnpm test`, `pnpm typecheck`, and `pnpm lint` all pass.
- [ ] `pnpm build && pnpm start` serves all six list screens without an Auth.js or hydration error.
- [ ] Both locales render sortable-header labels correctly: `/credits` and `/en/credits` show translated column text, not a raw key.
- [ ] Existing filters (`ListFilters` selects, `SearchInput` boxes) and pagination links still work unchanged on every screen touched.

---

## Decisions

- **Yes:** server-rendered `<Link>` headers, the same pattern `components/pagination.tsx`'s `PageLink` already uses. No new Client Component or hydration boundary, consistent with "the filters are the URL."
- **No:** a Client Component with `onClick` + `router.replace()`, matching `ListFilters`. Rejected because sorting, unlike typing into a search box, has no debounce need — every click is already a discrete navigation, so the plain-link approach `Pagination` uses is strictly simpler and costs nothing.
- **Yes:** ledger-derived figures (`Créditos`/`Saldo` on Clientes; `Total`/`Pagos`/`Saldo`/`Estado` on Créditos) stay unsortable on the two paged tables. Sorting them would silently reorder only the current 50-row page while claiming to reorder the whole list — a correctness bug wearing a feature's clothes.
- **Yes:** every derived figure is sortable on the three unpaged tables (`Rutas`, `Cobradores`, `Usuarios`). They already materialize their full row set in memory before rendering, so a JS sort there is a true full-set sort, not a page-local one — the constraint above doesn't apply.
- **Yes:** `Pagos.Saldo` (the running balance) is sortable even though it lives on the same screen category as the two unsortable ledger-derived cases elsewhere. It is a stored column (`ledgerEntries.runningBalance`), read directly, not re-derived by walking the ledger — the code comment on `listPayments` already documents this distinction.
- **Yes:** sorting resets `?page=1`, mirroring `ListFilters.apply()`'s existing rule for filter changes. The reasoning is identical: a page number computed against yesterday's order is very likely the wrong page against today's.
- **Yes:** single-column sort only, three-state cycle (asc → desc → default) via repeated clicks on the same header, no separate "clear" control. No screen here has UI room for a sort-stack indicator, and the existing filter bar has no "clear all" either — sorting should feel like the same kind of control.
- **Yes:** a muted chevron pair always visible on sortable headers, not only on hover. This is an admin back-office screen, not a marketing page — discoverability matters more than a clean unsorted header, and the existing filter bar is already never minimal (search box + selects are always present).
- **No:** date-range filtering. Raised during scoping, but it is a new filter control, not a sort — it belongs in its own spec if wanted.
- **No:** multi-column sort. Overengineering for six tables whose largest is 8 columns; nobody has asked for a secondary key.
- **No:** wiring up the decorative `SearchInput` on `/routes`, `/collectors`, `/admin/users`. Real, but a pre-existing defect unrelated to sorting — folding it in here would blur what this spec is accountable for.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Prisma relation-field sorts (`Cliente` on `/clients` ordering by `customer.firstName`, `Cobrador` ordering by `route.collector.firstName`) need nested `orderBy` objects, not flat column names — easy to get the nesting wrong and have Prisma silently ignore the clause. | Step 3's `pnpm typecheck` catches a malformed `orderBy` shape at compile time, and each per-table acceptance criterion is checked by hand, not just by type-checking. |
| `SortableHead<K extends string>` is generic across six unrelated key unions; a copy-paste mistake could let `/credits` pass a `PaymentSortKey` and compile fine (both are plain string unions) while breaking at runtime with an unrecognized key. | `parseSort()` already treats an unrecognized key as `null` (default order) rather than throwing, so the failure mode is "sort silently no-ops," not a crash — degrades safely. |
| An anchor-tag sort control reads to a screen reader as a link, not a button with a pressed/sort state — less discoverable than a native `<button aria-sort>` pattern. | Same trade-off `Pagination` already made for the identical reason (works pre-hydration); not a regression this spec introduces. |

---

## What is **not** in this spec

- Sorting `Créditos.Total/Pagos/Saldo/Estado` or `Clientes.Créditos/Saldo` — ledger-derived, needs SQL-side derivation first.
- Multi-column sort.
- Date-range filtering.
- Wiring up the decorative `SearchInput` on `/routes`, `/collectors`, `/admin/users`.
- Sub-tables on detail pages and the field-collector screens under `app/[locale]/field/`.
- Any change to `lib/ledger.ts`, `syncCredit()`, or a column's underlying value.

Each one, if it lands, goes in its own spec.
