# Centauro Créditos — PHP → Next.js Migration Plan

**Status:** Phases 0–1 merged. Phase 2 is code-complete and awaiting review; the ETL still needs one run against the real dump.
**Last updated:** 2026-08-10

---

## Context

`centauro_old` is a lending/collections admin app for a Guatemalan micro-credit business (currency **GTQ / "Q."**, national ID **DPI**), written in procedural PHP 8.1 + mysqli against MySQL 5.7. No framework, no build step, no tests, no migrations — every feature is a hand-rolled triple of `page.php` + `BLL/entity.php` + `js/ajax/entity-ajax.js`, with vendored Bootstrap/jQuery/DataTables. The schema exists only inside the SQL strings; there is no dump in the repo.

`centauro_credits` is the replacement — a Next.js 16 App Router project.

`centauro_assets/uploads/lending-administration-dashboard/` is **not a mockup — it is a complete, runnable Next.js 16 app** (~5,100 LOC) implementing the target design: shadcn `base-nova` over `@base-ui/react`, Tailwind v4 with an oklch token system, light/dark theming, lucide icons, recharts. It ships 15 pages. The sibling `Credit Management and Reports Hub.dc.html` designs 5 more screens that have no `.tsx`. `support.js` and `.dc.html` are design-tool artifacts, not runtime code.

**Decisions taken:** i18n from day one (Spanish default), PostgreSQL with a one-time migration off MySQL, feature parity with the old app (no invented lending features), and a first deliverable that is the full design port across all screens.

The design was drawn for a generic US lending product ("Lendly", USD, credit scores, amortization schedules, per-credit rate/term). Centauro's real domain is simpler and different. **Section 5 is the binding mapping — port the design's layout and visual system, not its data model.**

---

## 1. Target stack

| Concern | Choice | Status |
| --- | --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript | ✅ in place |
| UI | shadcn `base-nova` + `@base-ui/react` + `lucide-react` + `recharts` | ✅ in place |
| Styling | Tailwind v4, CSS-first, oklch tokens in `app/globals.css` | ✅ in place |
| i18n | `next-intl`, `es` (default) + `en`, `localePrefix: 'as-needed'` | ✅ in place |
| DB | PostgreSQL 16 | ✅ in place |
| ORM | Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`) | ✅ in place |
| Mutations | Server Actions + `zod` — replaces `BLL/*.php` + jQuery AJAX | ⬜ Phase 4 |
| Auth | Auth.js v5 Credentials provider, JWT session, role in token | ⬜ Phase 3 |
| Passwords | `bcryptjs` — verifies the existing PHP `$2y$` hashes, no resets | ⬜ Phase 3 |
| PDF | `@react-pdf/renderer` for reports; print-CSS for receipts | ⬜ Phase 5 |
| Deploy | Docker + docker-compose → Dokploy | ⬜ Phase 6 |

---

## 2. Branching workflow

All work happens in `centauro_credits/`. **Each phase gets its own branch, cut from `main`, reviewed, and merged before the next phase starts.**

| Phase | Branch | Status |
| --- | --- | --- |
| 0 | `phase-0-foundation` | ✅ merged |
| 1 | `phase-1-design-port` | ✅ merged |
| 2 | `phase-2-postgres-migration` | ✅ complete, awaiting merge |
| 3 | `phase-3-auth` | ⬜ |
| 4 | `phase-4-data-wiring` | ⬜ |
| 5 | `phase-5-reports` | ⬜ |
| 6 | `phase-6-deployment` | ⬜ |

Protocol: `git checkout main && git pull && git checkout -b phase-N-<name>` → implement → commit in logical chunks (not one giant commit) → report the diff summary and stop for review → on approval, merge and cut the next branch. Phase 4 may warrant sub-branches per vertical slice.

**No phase branch is merged and no phase begins without explicit approval.**

---

## 3. Phases

### ✅ Phase 0 — Foundation (merged, 4 commits)

Design system ported verbatim: `globals.css` (oklch light/dark tokens), 15 `components/ui/*`, `lib/utils.ts`, `components.json`, icons. Shared components adapted to the domain. `next-intl` wired with routes under `app/[locale]/`.

**Deviations from the original plan, all deliberate:**

- **`middleware.ts` → `proxy.ts`.** Next 16 deprecates the middleware file convention.
- **`localeDetection: false`.** Default next-intl redirected `/` → `/en` on an English browser, contradicting "Spanish default". `/` is now always Spanish; explicit switches persist via cookie.
- **`theme-toggle` rewritten** with `useSyncExternalStore` + `MutationObserver`. The reference app's `setState`-in-effect is an ESLint error here, and the DOM (not React) owns the `dark` class.
- **`components/dashboard/*` deferred to Phase 1**, since they depend on the mock-data shape Phase 1 defines.
- `pnpm-workspace.yaml` needs `allowBuilds` for `@parcel/watcher` / `@swc/core` (transitive via next-intl) or `pnpm install` exits non-zero.

### ✅ Phase 1 — Full design port, all screens (complete, 3 commits, 42 files, +6,153 lines)

**23 screens.** Ported from the reference app: dashboard, login, and list/new/detail for clients, credits, collectors, routes. Built from `.dc.html`: payments, receipt, reports, admin users, admin settings. Net-new with no design: `/daily-close` (legacy `newIncome.php`), `/credits/import` (`newHistory.php`), `/field/collect` + `/field/today` (collector role).

`lib/mock-data.ts` is shaped like the Phase 2 Postgres schema and **derives credits from seeds using the real business rules** rather than hand-written totals — so the mock data cannot silently disagree with the logic. `lib/format.ts` centralizes GTQ/date formatting.

Extracted for reuse: `SummaryStat`, `FormField`, `SearchInput`, `SelectField`, `LinkButton`, `AdminTabs`, `LocaleSwitcher`.

**Verified:** build and lint clean; all 23 routes serve 200 in both locales; no missing-message or Base UI warnings; ledger math correct (payoff detection, 70-day bad record, voided-payment exclusion, 18.2% delinquency); print rules match the receipt; all 20 tables wrapped in `overflow-x-auto`.

**Four defects found by running the app, not by the build:**

1. Amounts rendered `24.450 GTQ` — the URL locale `es` is Spain, not Guatemala. Fixed with `intlLocale()` + `currencyDisplay: 'narrowSymbol'`.
2. Every `Select` showed its raw value ("1" instead of "Carlos Mejía"). Base UI's `Select.Value` needs an `items` map on the root. Fixed once in `SelectField`.
3. Base UI warned on all 22 `Button render={<Link/>}`. Fixed once in `LinkButton` with `nativeButton={false}`.
4. The aging donut rendered zero sectors under recharts 3 → replaced with a stacked proportion bar (better for four ordered buckets anyway).

**Deviations:** aging donut is now a bar; a locale switcher was added to admin settings (without it the English locale was unreachable).

**Not verified:** the mobile drawer at <1024px — the browser tooling could not drive a narrow viewport. Breakpoints are intact from the reference design and tables scroll, but this deserves a manual check on a phone.

### ✅ Phase 2 — PostgreSQL schema + data migration (complete, 6 commits)

Postgres 16 + Prisma 7. The schema, the migration, the seed and the ETL all exist and run; `scripts/legacy-fixture.sql` reconstructs the legacy DDL from the old app's prepared statements so the ETL could be exercised end to end before the real dump arrives.

**Still outstanding: one ETL run against the real `mysqldump`.** Everything below the schema is inferred from SQL strings — column widths, nullability and any column the PHP never touches are guesses, and the real dump takes precedence.

Reconstructed old schema:

```
commerce(idCommerce, name)
route(idRoute, codeRoute, routeName, details, _idCollector, state)
collector(idCollector, firstName, lastName, address, mobile, DPI, birthDate, state)
customer(idCustomer, _idCommerce, _idRoute, DPI, firstName, lastName, address, mobile, mobile2, state)
credit(idCredit, _idCustomer, _idCollector, code, dateStart, total, cancel, record)
balance(idBalance, _idCredit, date, balpay, amount, balance, state)
income(idIncome, _idCollector, date, incomes, base, exes, credits)
user(idUser, _idCollector, firstName, lastName, userName, passWord, permissions, state)
```

New Prisma schema — snake_case, real FKs, `Decimal(12,2)` for all money (the old app used floats, a live rounding bug), booleans instead of `state`/`cancel`/`balpay` int flags, `timestamptz` audit columns:

`commerce` · `collectors` · `routes` · `customers` · `credits` · `ledger_entries` · `daily_closes` · `users`

Two modelling notes that matter:

- **`balance` → `ledger_entries`.** The old table conflates two record types: row 1 per credit is the *origination* (`balpay=0`, `amount = balance = total * 1.15`), later rows are *payments* (`balpay=1`) carrying a denormalized running balance. Model as `kind: 'origination' | 'payment'`, keep `running_balance` materialized (the UI reads it constantly), and enforce recomputation in one place — a single `recalculateBalances(creditId)`. `state=1` becomes `voided_at`; voiding must re-derive every later `running_balance`, exactly as `BLL/balance.php` does.
- **`income` → `daily_closes`,** with `UNIQUE (collector_id, close_date)`. The old app has no such constraint and silently permits duplicate closes.

The flat 15% lives as `credits.interest_rate Decimal(5,4) DEFAULT 0.15` — per credit rather than hardcoded in four PHP files, so historical credits stay correct if the rate changes. `credit.record` → `bad_record`.

**ETL** — one-shot `scripts/migrate-from-mysql.ts` reading MySQL via `mysql2`, writing through Prisma: preserve original IDs (so card numbers reconcile), map flags, recompute every `running_balance` from scratch and **assert it matches the stored one**. Mismatches are pre-existing corruption — report, never silently overwrite. Run against a dump copy, never the live DB.

Three conditions abort the run rather than guess, each with an opt-out flag: orphaned foreign keys (`--allow-orphans`), duplicate daily closes (`--merge-duplicate-closes`, keeps the highest id), and duplicate usernames (no flag — a login must be unambiguous). `--dry-run` reports all of them at once and writes nothing.

**Beyond the original plan, all deliberate:**

- **`lib/ledger.ts`** — the payoff total, running-balance walk and bad-record flag as one pure module, in integer centavos, with 16 Vitest cases. The plan filed tests under "suggested" for Phase 4, but the ETL's balance assertion is meaningless without a trusted implementation to assert against. Two legacy quirks are reproduced on purpose and pinned by tests: a voided row leaves the balance flat, and the record date is measured to the last non-voided row rather than to the payment that zeroed the balance.
- **`scripts/legacy-fixture.sql`** — the legacy DDL reconstructed from the prepared statements, plus dirty fixture data. It exists so the ETL is not shipped unrun.
- **`prisma/seed.ts`** — loads `lib/mock-data.ts` through the real schema and cross-checks its inline ledger math against `lib/ledger`.
- **`commerce.active`** — the legacy `commerce` table has no `state` column, so a commerce could be created but never edited or retired. The Phase 1 screens already assume it.
- **`users.last_login_at`** — so the admin screen's "última actividad" column can show something true in Phase 3.
- **Soft delete confirmed** for credits and ledger entries (`deleted_at`), settled early because it decides a column. The old app hard-deletes a credit *and its whole payment history*.
- Dev Postgres binds host port **5433**; 5432 was already taken on this machine.

**Verified against the fixture:** the ETL reports a centavo of origination drift, a drifted stored balance, a `cancel` flag contradicting its own ledger, a credit with no ledger at all, three orphan classes and a duplicate close — while correctly *not* flagging the stale balance a legitimate void leaves behind. Row counts and `SUM(principal)` reconcile. Zero dates become `NULL`, `_idCommerce = 0` becomes `NULL`, `permissions` 0/1 map to `admin`/`collector`, and `$2y$` hashes survive intact — `bcryptjs` verifies them unchanged, confirming Phase 3 needs no password resets.

**Not verified:** anything that depends on the real dump — actual column widths, charset/encoding of accented names, and the true volume (the transaction budget is set to 30 minutes and inserts are batched at 1,000 rows, but neither has met a real table).

### ⬜ Phase 3 — Auth and roles

Auth.js v5 Credentials provider querying `users`, `bcryptjs.compare` against the migrated `$2y$` hash (bcrypt hashes are portable — **no password resets**), rejecting inactive users. Session JWT carries `userId`, `role`, `collectorId`.

Roles are the old app's two (`permissions` 0/1): **`admin`** (everything) and **`collector`** (`/field/*` only, scoped to their own `collector_id`).

Enforce in three layers: proxy for route access, `requireRole()` at the top of every Server Action, and the `nav` filter in `app-shell.tsx` (already built, currently driven by a `role` prop). **The old app only ever did the third** — server-side enforcement is a genuine security fix, not a refactor.

Replace the `SIGNED_IN_COLLECTOR_ID` constant in the two `/field` pages with the session.

### ⬜ Phase 4 — Wire screens to real data

Replace mock imports with Server Components reading through Prisma; convert every form to a Server Action (`zod`-validated, `revalidatePath`, `useActionState` for pending/error). Vertical slices in dependency order:

`commerce → collectors → routes → customers → credits → ledger/payments → daily-close → dashboard → reports → admin`

Business rules to port faithfully (they are the product):

- New credit → credit + origination ledger row at `total * (1 + rate)`, one transaction.
- Payment → append ledger row, decrement balance; at zero set `cancelled_at`, and `bad_record` if payoff took > 30 days.
- Void payment → set `voided_at`, recompute all later running balances.
- Edit credit → re-derive origination and cascade through every non-voided row.
- Delete credit → currently a **hard** delete of credit + balance rows. Change to soft-delete for auditability; **this is an intentional behaviour change and should be confirmed.**

Dashboard queries map from `BLL/dash*.php`: monthly `incomes`/`base`/`exes`/`credits` per collector, `cash = (base + incomes) - (credits + exes)`, and portfolio totals.

### ⬜ Phase 5 — Reports

Three reports exist (`ReportsPDF/` + `BLL/rpt*.php`), built as PHP-concatenated HTML rendered by a vendored mPDF: **Credits**, **Customers by Collector**, **Income by Collector**. Rebuild as `@react-pdf/renderer` documents served from `app/api/reports/[report]/route.ts` with filters as search params. The `/reports` screen is already built as the filter + download UI. Receipts use the existing print-CSS route.

### ⬜ Phase 6 — Deployment

Multi-stage `Dockerfile` (Next standalone); `docker-compose.yml` with `app` + `postgres:16` + optional `adminer`, no Traefik labels (Dokploy injects them). Port `health.php` to `app/api/health/route.ts`. **Secrets are committed in plaintext in the old `docker-compose.yml` — do not carry them over; rotate and use Dokploy env vars.**

---

## 4. Design → domain mapping (binding)

| Design shows | Real domain | Action | Status |
| --- | --- | --- | --- |
| USD `$` | GTQ `Q` | `Intl.NumberFormat('es-GT', …)` via `intlLocale()` | ✅ |
| Client `creditScore` | no such data | **Dropped.** Column shows *Comercio* | ✅ |
| Per-credit `rate`/`term`/`frequency` | flat 15%, open-ended | **Dropped.** Form = client, collector, card no., date, amount | ✅ |
| Amortization schedule | free-form payment ledger | **Replaced** with the real ledger + *Anular pago* | ✅ |
| Payment `method` (cash/transfer/card) | field collections have no method | **Dropped.** Column shows route | ✅ |
| Delinquency aging buckets | no aging concept; only `record` (>30 days) | **Kept**, derived from days since last payment | ✅ |
| 7 invented statuses | `activo` / `cancelado` / `mal record` (+ ledger, people) | Collapsed to 6 real ones in `status-badge.tsx` | ✅ |
| "Lendly" branding, seed names | Centauro | Rebranded | ✅ |
| — | *Ingreso diario*, *Ingresar existente*, field screens | **Net-new**, built in the ported idiom | ✅ |

---

## 5. Critical files

**Read before starting a phase:** `centauro_old/CLAUDE.md` (accurate architecture summary), `BLL/credit.php` + `BLL/balance.php` (all ledger logic), `templates/sideBar.php` (feature/role inventory), `newIncome.php` (daily close), and `centauro_credits/CLAUDE.md` (stack, i18n conventions, domain rules).

**In `centauro_credits/`:**

- `app/[locale]/**` — all 23 screens; `app/globals.css`, `proxy.ts`, `next.config.ts`
- `components/ui/*` (15 primitives) + `app-shell`, `page-header`, `stat-card`, `status-badge`, `theme-toggle`, `summary-stat`, `form-field`, `search-input`, `select-field`, `link-button`, `admin-tabs`, `locale-switcher`, `record-payment-dialog`, `new-user-dialog`, `daily-close-form`, `credit-history-form`, `credit-amount-fields`, `print-button`, `dashboard/charts`
- `lib/{utils,format,mock-data}.ts`; Phase 2 added `lib/{ledger,db,prisma-client,db-utils}.ts` → Phase 3 adds `lib/auth.ts`, Phase 4 `lib/actions/*.ts`
- `i18n/{routing,navigation,request}.ts`, `messages/{es,en}.json`
- `prisma/{schema.prisma,seed.ts,migrations/}`, `prisma.config.ts`, `scripts/{migrate-from-mysql.ts,legacy-fixture.sql}`, `docker-compose.dev.yml`
- Phase 6: `Dockerfile`, `docker-compose.yml`, `app/api/health/route.ts`

---

## 6. Verification

**Phase 1 (done):** build + lint clean; every route resolves in both locales; no missing-message warnings; ledger math checked against the rules; print rules verified.

**Phase 2 (done against a reconstructed fixture; repeat against the real dump):** `pnpm db:migrate-legacy --dry-run` first — it reports every blocking condition and writes nothing. Then run it for real and check that per-table row counts match MySQL, `SUM(credits.total)` matches, and every reported balance mismatch is understood before the database is used. Investigate mismatches — do not auto-correct.

**Phase 4 (behaviour parity):** run old and new side by side on the same data and diff — create a credit (origination = `total × 1.15`), pay to zero (→ cancelled, `bad_record` iff > 30 days), void a mid-sequence payment (→ later balances re-derived), submit a daily close (→ one `daily_closes` row + N ledger rows, atomic), and confirm a `collector` session gets 403 on `/clients` **at the server**, not merely a hidden nav link.

**Suggested test setup** (none exists in either project): Vitest for the ledger math — `recalculateBalances`, payoff/`bad_record` detection, and void-cascade are the three places a bug silently corrupts money.

---

## 7. Open risks and questions

- **No schema dump yet.** Phase 2 was built against a reconstructed schema and is unblocked, but the ETL has never seen real data. *(blocking for Phase 4, not for Phase 3)*
- ~~**Hard-delete → soft-delete** for credits~~ — confirmed; `deleted_at` is in the schema. The Server Action behaviour still has to be written in Phase 4.
- Old money columns are floats; some historical balances will not reconcile to the penny. Surface during ETL rather than papering over.
- MySQL 5.7 is EOL and the compose file commits DB credentials in plaintext. Rotate during Phase 6.
- The mobile drawer (<1024px) has not been verified interactively.
- The design app pins older ranges (`@base-ui/react` 1.5, `lucide-react` 1.16) than what installed here (1.7, 1.31). No issues so far beyond the recharts 3 `Pie` behaviour noted above.
