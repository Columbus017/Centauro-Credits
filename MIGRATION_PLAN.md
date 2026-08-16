# Centauro Créditos — PHP → Next.js Migration Plan

**Status:** Phases 0–5 merged. Phases 6 (deployment) and 7 (the real data) are code-complete and awaiting review. Two things remain before go-live: **paging on the list screens**, which the real volume makes a blocker, and the deploy to the new host.
**Last updated:** 2026-08-16

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
| Mutations | Server Actions + `zod` — replaces `BLL/*.php` + jQuery AJAX | ✅ in place |
| Auth | Auth.js v5 Credentials provider, JWT session, role in token | ✅ in place |
| Passwords | `bcryptjs` — verifies the existing PHP `$2y$` hashes, no resets | ✅ in place |
| PDF | `@react-pdf/renderer` for reports; print-CSS for receipts | ✅ in place |
| Deploy | Docker + docker-compose → Dokploy | ✅ in place |

---

## 2. Branching workflow

All work happens in `centauro_credits/`. **Each phase gets its own branch, cut from `main`, reviewed, and merged before the next phase starts.**

| Phase | Branch | Status |
| --- | --- | --- |
| 0 | `phase-0-foundation` | ✅ merged |
| 1 | `phase-1-design-port` | ✅ merged |
| 2 | `phase-2-postgres-migration` | ✅ merged |
| 3 | `phase-3-auth` | ✅ merged |
| 4 | `phase-4-data-wiring` | ✅ merged |
| 5 | `phase-5-reports` | ✅ merged |
| 6 | `phase-6-deployment` | ✅ complete, awaiting merge |
| 7 | `phase-7-legacy-import` | ✅ complete, awaiting merge |

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

**The ETL has now met the real dump** — see Phase 7. Two of the inferred types were wrong (`bit(1)` flags, `decimal(9,2)` money) and both broke the import; the fixture had encoded the same guesses, so it could not have caught them. Everything in this section that the dump has since settled is corrected in place.

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

New Prisma schema — snake_case, real FKs, `Decimal(12,2)` for all money, booleans instead of the `state`/`cancel`/`balpay` flags, `timestamptz` audit columns:

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

### ✅ Phase 3 — Auth and roles (complete, 3 commits)

Auth.js v5 Credentials provider over `users`, JWT session carrying `role` and `collectorId`. `bcryptjs` verifies the migrated `$2y$` hashes unchanged — **no password resets**, confirmed against the seeded data. Inactive accounts are refused. An unknown username, a wrong password and a deactivated account are one indistinguishable failure that all cost a full bcrypt compare, so neither the message nor the timing enumerates who has an account; `BLL/logueo.php` returned immediately when the `SELECT` found nothing.

The config is split: `lib/auth.config.ts` touches no database, so `proxy.ts` reads the cookie on every request without bundling Prisma. `lib/auth.ts` adds the provider and is the only module that queries `users` — it also stamps `last_login_at`, the column Phase 2 added for the admin screen.

**The three layers, and what each is actually for:**

1. **`proxy.ts`** — optimistic, cookie-only, per the Next.js authentication guide. No session redirects to `/login` in the request's own locale; a signed-in user is bounced off the login screen; a collector asking for `/` lands on their round rather than a 403; a role that overreaches is **rewritten** to `/denied`, a route whose only job is to call `forbidden()`. Rewritten rather than redirected so the answer is a real 403 at the URL that was asked for.
2. **`lib/session.ts`** — `requireUser()` / `requireAdmin()` / `requireCollector()`, at the top of every page. This is the layer that protects data, and it was verified to hold with layer 1 switched off.
3. **`app-shell.tsx`** — the `nav` filter, now driven by the session. **The old app only ever had this one.**

`AppShell` became a Server Component that reads the session and passes role and name to the frame, so every screen behind the login is authenticated by construction. `SIGNED_IN_COLLECTOR_ID` is gone from both `/field` pages.

**Beyond the original plan, all deliberate:**

- **A collector may open `/credits/[id]` and `/payments/[id]/receipt`.** "`/field/*` only" would have left the shipped field screens linking into 403s, and the legacy `listCreditsOp.php` already showed the same ledger in its *Balance de Saldos* modal. Both screens hide what belongs to the admin (the client link, the breadcrumb, *Anular pago*) and send a collector back to their own round.
- **Row-level scoping is enforced now, against the mock data.** Route access is not row access — without it a collector read any credit's ledger and any client's receipt by changing the number in the URL. Phase 4 folds the same check into the query.
- **`/field/*` is denied to admins.** Every figure on those screens is scoped to a `collector_id` an admin has not got.
- **`experimental.authInterrupts`** is on, for `forbidden()` / `unauthorized()`. It is the only sanctioned way to answer with a real 403 or 401 from a Server Component.
- **`lib/actions/auth.ts`** arrives a phase early — the login form needs a Server Action, and the plan filed `lib/actions/*` under Phase 4.
- **`lib/roles.ts`** is the shared route policy, with 45 tests. It caught a real hole on the first run: `/credits/[^/]+` also matched `/credits/new` and `/credits/import`, which would have handed a collector the two screens that create credits.
- **`@auth/core` is a devDependency** for one type augmentation. Augmenting `next-auth/jwt` does nothing — it only re-exports — and pnpm does not hoist the real module where TypeScript can resolve it.
- Every route is now server-rendered on demand. Reading a session is reading a cookie, and nothing that does that can be static.

**Verified** by driving the running app and the built app, not by the build: the full route matrix for both roles in both locales (admin 200s everywhere but `/field/*`; collector 200 on their four screens and 403 on the other thirteen, including `/en/clients`); sign-in, sign-out and the wrong-password message; `last_login_at` written on success and not on failure; row scoping (collector 1 opens credits 1 and 5, is refused 2, 3 and 4, and is refused another collector's receipt); the layers verified independently by neutralising the proxy check and confirming the pages still answer 403.

**Three defects that only running the app revealed:**

1. **Auth.js 500s on every production request** — it refuses to derive its own URL from the request host unless told to (`UntrustedHost`). Dev mode trusts localhost and hides this completely. `trustHost: true`, which also matters for Phase 6: the reverse proxy in front must set `X-Forwarded-Host` itself.
2. **The 403 and 401 screens were stuck in light mode.** Both render through Next's own error shell — `<html id="__next_error__">`, not the locale layout — and React never executes a `dangerouslySetInnerHTML` script it renders on the client, so the anti-FOUC script never ran. The rule now lives once in `components/theme-script.tsx`.
3. **A collector could read any credit and any receipt by id** (see above).

**Not verified:** nothing exercises a `collector` user whose `collector_id` is null — `requireCollector()` answers 403 rather than rendering empty screens as the legacy app did, but no such row exists in the seed. Sessions expire after 12 hours; the expiry path has not been waited out.

### ✅ Phase 4 — Wire screens to real data (complete, 5 commits)

Every screen reads through Prisma and every form is a Server Action. `lib/queries/*` returns the row shapes the screens were already written against, so the read swap stayed mechanical; `lib/actions/*` holds the writes.

**The rules, all ported and all verified against the database:**

- New credit → credit + origination row at `principal × 1.15`, one transaction.
- Payment → append, re-derive; at zero set `cancelled_at`, plus `bad_record` if payoff took over 30 days.
- Void → `voided_at`, then every later running balance re-derived.
- Edit credit → origination moved and the whole ledger cascaded.
- Delete credit → **soft**, with its payment history. Confirmed in Phase 2; this is where the behaviour change actually lands.
- Daily close → one `daily_closes` row and N ledger rows, atomic, and refused if that collector already closed that day.
- Dashboard → `cash = (base + incomes) - (credits + exes)` and the monthly series, from `daily_closes` and the ledger.

**One place, not four.** Every write ends in `syncCredit()`: re-walk the ledger, correct any moved balance, re-derive `cancelled_at` and `bad_record`. The legacy versions disagreed — the payment path read the last balance without filtering voided rows, the void path never revisited `cancel`, and each compared `balance == 0` in float, so an overpayment left a credit open for good.

**Three legacy defects do not survive the port:**

1. **Voiding the payment that closed a credit** left it `cancel = 1` with money owing. It now returns to *activo*.
2. **Deleting a credit** issued `DELETE FROM balance` then `DELETE FROM credit`, destroying a real loan's history. Now `deleted_at` on both.
3. **The daily close** committed its income row first and posted payments afterwards, so a failure halfway left a close claiming money no credit had received. Now one transaction.

**Beyond the original plan, all deliberate:**

- **Row-level scoping moved into the queries.** `Scope` threads a `collector_id` through every read, replacing the checks Phase 3 wrote beside them. A collector asking for another's credit now gets 404 rather than 403 — the row does not exist for them, and the answer no longer confirms that it exists at all.
- **Edit screens for clients, collectors and routes.** Phase 1 built create-only while the legacy app had `editCustomer.php` and friends; create and edit are now one component and one schema, where the legacy kept two copies whose validation drifted.
- **The daily close stopped trusting free text.** A payment names a live credit on the chosen collector's round, and `collected` is the sum of what was posted rather than a second number the operator typed — in the legacy form the two could disagree.
- **Two figures the design asked for and the data cannot support.** The per-tile deltas are gone except on *collected*, which is a flow with last month in the ledger; the rest are stocks with no prior snapshot, and the mock deltas were invented. The "recent reports" table had no table behind it.
- **The settings screen is honest.** The interest rate lives per credit and the grace window is a constant, so both are read-only with a hint saying why. It gained the marketplace management `BLL/commerce.php` never had.
- **"Client since" is the date of their first credit.** The legacy `customer` table records no creation date, so `created_at` would claim every migrated client joined on the migration day.
- **`lib/clock.ts`** puts "today" in `America/Guatemala`, not the container's zone, and the development fixture slides its dates to meet it — frozen in 2024 it left every credit months overdue and no day with any activity. Intervals are preserved, so delinquency is still the 18.2% Phase 1 verified.
- **Two guards the legacy app lacked**: a password minimum on new logins, and a refusal to deactivate your own account.
- 52 Vitest cases now, adding the daily-close formula and the clock.

**Verified by driving the running app against Postgres**, then reading the rows back: a credit created at Q1,000 books an origination of Q1,150; a Q500 payment leaves Q650; a Q700 payment is refused *with the client-side guard bypassed*; Q650 closes it as *cancelado* with no bad record; voiding the mid-sequence Q500 re-derives the later balance to Q500 and returns the credit to *activo*; editing the principal to Q2,000 moves the origination to Q2,300 and cascades; deleting keeps all three rows with `deleted_at` while the screen 404s. A daily close writes one row and one payment atomically, computes Q700 = (1000+300)−(500+100), and a second close for the same day is refused. Both roles' full route matrices still hold in both locales.

**One defect only running the app revealed:** adding `onValueChange` to `SelectField` — a Server Component — made it forward a function to a Client Component unconditionally, which 500'd `/clients`, `/credits` and `/payments`. The build was clean throughout.

### ✅ Phase 5 — Reports (complete, 3 commits)

The three legacy reports, rebuilt as `@react-pdf/renderer` documents served from `/api/reports/[report]` and previewed on screen: **Clientes por cobrador**, **Créditos terminados por cobrador**, **Ingresos por fecha**. Receipts keep the Phase 1 print-CSS route, untouched.

**The plan said the `/reports` screen was already the filter UI. It was not.** Phase 1 shipped three cards with static filter chips and a dead button, and the chips were invented — `route` and `status` filters that no report ever had. All three legacy forms open with a mandatory *Cobrador* select; the second adds a date range and the third a single date. `lib/reports.ts` now says so, and the cards carry real inputs.

**One dataset, two renderers.** `lib/reports.ts` holds the filter schemas, the column layouts and the cell formatting; `lib/queries/reports.ts` returns positional rows in that column order. The screen table and the PDF both read it, so a downloaded report says exactly what the table above the download button said. The legacy pair had already drifted: the AJAX table for the income report listed six columns and no PDF for it existed at all.

**Filters are the URL.** The screen renders from search params and the download link carries the parsed filters to the API route. `reports-ajax.js` kept two disconnected copies — the table read the form on submit and `printReport1()` re-read it at click time, so editing a filter after generating a list printed something other than what was on screen.

**Ten legacy defects do not survive the port:**

1. **The *Fecha de cancelación* column printed today's date on every row of every run.** `Credits.php` read `$credits['dateP']` from a query that aliased the column `fechaP`; PHP handed the undefined value to `date_create()`, which answers *now*.
2. **The income report had no PDF.** `reports.php` renders an *Imprimir* button calling `printReport3()`, which is defined nowhere in `js/`. It threw a ReferenceError. That document now exists.
3. **No authentication anywhere.** `BLL/rpt*.php` and `ReportsPDF/*.php` never include `functions/sesiones.php` — an unauthenticated GET pulled a collector's whole book. Now 401 without a session, 403 for a collector.
4. **`$_POST` interpolated straight into SQL**, in six statements across five files. Every filter is now zod-validated before it reaches a query.
5. **`d/m/Y` through `strtotime()`**, which reads `01/02/2026` as January 2nd — a silent off-by-a-month on any ambiguous day. ISO only.
6. **A deactivated collector printed a blank heading.** The name subselect carried `AND state = 0` while the row query did not, so the table had rows and the title had nobody.
7. **Balances read off the last `balance` row and totalled in browser floats.** Both are derived now, through `lib/ledger.ts` in centavos.
8. **Every download was named `NombreReporte.pdf`**, so a second one overwrote the first. Names are dated and carry the report.
9. **mPDF fetched Bootstrap and W3.CSS from two CDNs at render time**, so no PDF could be produced without outbound internet. Nothing here leaves the process.
10. **The table heading did not repeat across pages.** It does, and rows no longer split across a page break.

**Beyond the original plan, all deliberate:**

- **The route answers status codes rather than calling `forbidden()`.** `proxy.ts` excludes `/api`, so the session check in the handler is not a repeat of layer 1 — it is the only one, which is exactly why `lib/session.ts` reads at the data source. `forbidden()` / `unauthorized()` are Server Component interrupts and have no error boundary to render into in a route handler.
- **Report 2 selects on the stored `cancelled_at` while every figure it shows is derived.** The column is written by `syncCredit()` from the same `payoffState()` the projection uses, so they agree by construction — and doing the range in SQL keeps the report from walking the ledger of every credit a collector ever wrote.
- **Report 2 has no total**, because its legacy tab had no total box. The other two keep *Total por recaudar* and *Total ingresos*.
- **Landscape LETTER.** Seven columns wrapped client names onto three lines in the legacy portrait layout.
- **Hyphenation is off.** react-pdf's default callback is English and split a heading into "Fecha de can-celación"; a Guatemalan surname is not a word it may break either.
- **No logo.** The legacy PDFs embedded `images/logo.png`; this app has no such asset, so the header is typographic and matches the shell's wordmark.
- **The locale is a search param**, since the PDF route lives outside `app/[locale]/`. A report downloaded from `/en/reports` reads in English, columns and dates included.
- 67 Vitest cases now, 15 of them new.

**Verified by driving the running production build** (`pnpm build && pnpm start`, per Phase 3's lesson), then reconciling every figure against SQL: the auth matrix on the endpoint (401 anonymous, 403 collector, 200 admin); rejection of `abc`, `0`, `-1`, `2.5` and `1 OR 1=1` as collector ids, of `01/02/2026` as a date, of an inverted range, and of an unknown report name — 400 each, 404 for a collector who does not exist. Report 1 totals Q4,925.00 over five credits and report 3 totals Q470.00 over three payments, both matching `SUM` exactly; report 2 prints the real payoff dates 24/02/2026 and 16/05/2026 where the legacy printed the day of the run. A range of `from = to = 2026-05-16` returns that day's payoff, confirming both ends inclusive as SQL `BETWEEN` was; a range with nothing in it renders the empty line. The screen's table and the PDF agree row for row. Sixty injected credits produce a three-page document with the heading repeated on each page and a total of Q94,970.00, again exact; the fixture was dropped and the database re-seeded afterwards.

**Not verified:** the `/reports` listing renders every row, like the other list screens — sixty is not a real book, and this is the same open risk. Only Latin-1 text has been through the standard fonts; a character outside WinAnsi would need a registered font file. The receipt print path was not re-exercised this phase.

### ✅ Phase 6 — Deployment (complete, 3 commits)

A multi-stage `Dockerfile` over `output: 'standalone'`, a `docker-compose.yml` for Dokploy, `/api/health`, and a README that is the runbook. The legacy image was `php:8.1-apache` with `COPY . /var/www/html/` — the whole repository, secrets and `.git` included, served as the document root by root.

**Two images out of one `deps` layer.** `runner` is the Next standalone server on `node:24-alpine`: 218 MB, non-root, no pnpm, no source, no dev dependencies, and only the `node_modules` files the traced routes import. `migrator` keeps the full toolchain, applies the migrations, and is also how the seed and the one-shot MySQL ETL are run against the deployed database — the phase that still has to happen needs a container that can run it. It is large (1.5 GB), but it is the same `deps` layer the build already produced, so the marginal cost is the source copy.

**Migrations are a service, not a startup step.** `prisma migrate deploy` runs to completion — gated on Postgres's own healthcheck — before `app` starts, so the schema is never being changed alongside the first request, and a failed migration fails the deploy instead of half-serving. `deploy` never generates a migration and never resets, which is the only form of the command that belongs near real data.

**Every secret is `${VAR:?…}`.** Compose refuses to start when one is missing rather than falling back to a default that then lives forever. `.env.production.example` lists them with the commands that generate them, and says plainly that the three passwords in the legacy compose file are in the repository history and must be rotated rather than reused. `adminer` is behind a `tools` profile; the legacy stack ran phpMyAdmin permanently on the public proxy network with its credentials in the file.

**`/api/health` answers what a probe needs and nothing else** — reachable or not, 503 when not, with a bounded check so a hung database cannot stop the orchestrator from restarting the container. `health.php` published `DB_HOST`, `DB_NAME`, `DB_USER`, the PHP version and the Apache banner to anyone who asked, unauthenticated.

**Beyond the original plan, all deliberate:**

- **The README replaced the `create-next-app` boilerplate** with the deploy runbook: first deploy, the forwarded-header requirement, the ETL commands, and a `pg_dump` line. Nothing in either project has ever backed this database up.
- **`docker compose` in the migrator is the ETL's production entry point.** Phase 2 shipped a script that could only be run from a developer's machine against a tunnelled database.
- **`init: true` and a 30-second `stop_grace_period`**, so `node server.js` as PID 1 reaps its children and Next gets the drain window its docs ask for.
- **The dev compose file is untouched.** `docker-compose.dev.yml` still owns the 5433 Postgres and the scratch MySQL; the production file shares nothing with it.

**Three things the container revealed that the build did not:**

1. **`/login` was prerendered at build time.** It is the one screen that reads no session, so Next rendered it during the build and `publicHeadline()` ran against whatever database the builder had — meaning an image build *required* a live database, and the two figures on the panel were frozen at build time. Locally this was invisible: the dev database was up, so the build passed. `force-dynamic` now.
2. **`ENV HOSTNAME=0.0.0.0` is mandatory.** Docker sets `HOSTNAME` to the container id and the standalone server binds `process.env.HOSTNAME || '0.0.0.0'` — left alone it binds to a name that resolves to loopback and nothing reaches it.
3. **`next build` copies any `.env` in the context into `.next/standalone`.** Without the `.dockerignore` entry a developer's local `.env` — `AUTH_SECRET` included — would be baked into the published image.

**Verified by running the built stack, not by the build:** compose refuses to start with a secret missing; `migrate` applies the schema on a cold volume, and on a second `up` reports *No pending migrations* and exits 0; the app comes up healthy and Postgres has no published port. Through the container: `/api/health` 200, `/` and `/credits` 307 to `/login` without a session, `/api/reports/*` 401 anonymous and 403 as a collector. Signing in as `mveliz` through the real login form lands on the dashboard with live figures — **no `UntrustedHost`**, which is the Phase 3 failure this phase had to not reproduce — and the collector matrix still holds in the image (`/credits` 403, `/field/collect` 200). A report PDF renders from the alpine container, so `@react-pdf/renderer` needs nothing that was left out. Stopping Postgres turns the probe to 503 and starting it turns it back to 200 without restarting the app. The seed and `pg_dump` both run from the compose file as the README documents them.

**Not verified:** anything on the real host. Nothing has been deployed to Dokploy — the Traefik labels it injects, the forwarded headers it sets, its own health polling and TLS are all assumed from the legacy stack's shape. The image was built and run on arm64 (Apple Silicon); the deploy target is almost certainly amd64, and while nothing here ships a native binary, the build has not been done for that platform. No restore has been rehearsed from the `pg_dump` the README recommends.


### ✅ Phase 7 — The real data (complete, 3 commits)

The dump arrived: `db.sql`, a phpMyAdmin export of MySQL 5.7.44 taken 2026-08-15, 3.7 MB. **4,737 credits back to 2017-08-11, 61,868 ledger rows, 1,426 daily closes, 511 clients, 502 commerce, 5 collectors, 5 routes, 4 users.**

**Reading it settled two guesses that no fixture could have caught,** because `scripts/legacy-fixture.sql` encoded the same ones:

1. **The flags are `bit(1)`, not `int(1)`.** mysql2 returns those as a Buffer, so every `value === 1` in the ETL was false. Uncorrected, the import would have written all 61,868 ledger rows as originations, no payment voided, no credit cancelled — and `state !== 1` inverted, so every deactivated client, collector and *login* would have come back active.
2. **The money columns are `decimal(9,2)`, not `double`.** mysql2 returns those as a string and `money()` called `.toFixed()` on it. This one crashed rather than corrupted.

`scripts/legacy-values.ts` holds both coercions, tested against the shapes MySQL really sends as well as the ones the fixture used, and the fixture now declares the real types.

**A third defect only the data revealed: every accented name was arriving mojibake.** The tables are `CHARSET=latin1` but the PHP connected with `mysqli_set_charset($conn, "utf8")`, so the bytes physically stored are UTF-8 that MySQL believes are latin1 — asked for utf8 it converts them *again*, and `Ñ` comes back `Ã‘`. Reading with `charset: 'binary'` and decoding the raw bytes gives the names back. All 13 non-ASCII values in the dump are valid UTF-8 that way; anything that is not is read as latin1 and reported.

**Two decisions the data forced:**

- **`UNIQUE (collector_id, close_date)` was withdrawn.** Phase 2 added it because the legacy app double-counted a collector's day. The real book has 11 such days across five years and only one is an identical double-submission; enforcing it retroactively meant discarding 11 rows and **Q71,725.00** of recorded collections. `submitDailyClose` refuses new ones — a check, not a guarantee, and the model says so.
- **`cancelled_at` and `bad_record` are derived, not copied**, like the running balances beside them already were. 23 credits contradict their own ledger: eight paid off but still marked active, one marked cancelled with Q25 owing. Every contradiction is in the report; what lands in the database is what the entries say.

**What the data is actually like.** No orphaned foreign keys, no credit without a ledger, and **every origination exactly `principal × 1.15`** — the 15% rule holds across nine years without exception. 34 findings in total: the 11 duplicate close-days, 23 flag contradictions, and 10 stored balances that disagree with their own entries — nine of those one cascade on credit 4257 that ends at a stored **−50.00**, an overpayment the old app recorded as a negative balance.

**Verified** by importing into Postgres and reading it back: every table's row count matches, `SUM(principal)` is 10,545,464.13 on both sides, ledger `SUM(amount)` 23,575,946.25 and daily-close `SUM(collected)` 6,197,490.00 match exactly. 57,131 payments against 4,737 originations, 249 voided rows, 10 inactive clients, 1 inactive collector — every one of which would have been zero or wrong before the flag fix. Cancelled credits land at 4,386 and bad records at 2,974, each reconciling to the legacy count plus the derived corrections minus credit 162. Accented surnames read correctly end to end. Then the app was driven against it: the dashboard, its six-month series, and the login panel all render real figures.

**The volume answers the open question, and badly.** Measured on a production build against the real book:

| Screen | Rows | Time | HTML |
| --- | --- | --- | --- |
| `/clients` | 511 | 0.53 s | 2.9 MB |
| `/credits` | 4,737 | 1.48 s | 16.4 MB |
| `/payments` | 57,131 | **22.9 s** | **297 MB** |

`/payments` is unusable and `/credits` is not far behind. Paging is no longer deferrable — it is the last thing between this and go-live.

**Also worth knowing before anyone sees the dashboard:** delinquency reads **92.9%** and the recovery rate 7.1%. Both are correctly derived — 326 of the 351 credits the old system still calls active have taken no payment in over 30 days. The figure is true; it means the book carries years of dormant credits nobody ever closed.

**Not verified:** the side-by-side diff against the running legacy app on the same data, which is the remaining Phase 4 item. The import was run on arm64 against a local Postgres, not on the deployment host.

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

- `app/[locale]/**` — 27 screens (Phase 4 added `edit` for clients, collectors, routes and credits) plus `forbidden.tsx`, `unauthorized.tsx` and the `denied/` rewrite target; `app/api/auth/[...nextauth]/route.ts`, `app/api/reports/[report]/route.ts`; `app/globals.css`, `proxy.ts`, `next.config.ts`
- `components/ui/*` (15 primitives) + `app-shell`, `page-header`, `stat-card`, `status-badge`, `theme-toggle`, `summary-stat`, `form-field`, `search-input`, `select-field`, `link-button`, `admin-tabs`, `locale-switcher`, `record-payment-dialog`, `new-user-dialog`, `daily-close-form`, `credit-history-form`, `credit-amount-fields`, `print-button`, `dashboard/charts`, `app-shell-frame`, `login-form`, `auth-notice`, `theme-script`, `forms/{form-errors,action-button,collector-form,route-form,customer-form,credit-form,commerce-card}`
- `lib/{utils,format,mock-data}.ts`; Phase 2 added `lib/{ledger,db,prisma-client,db-utils}.ts`; Phase 3 added `lib/{auth,auth.config,roles,session}.ts`, `lib/actions/auth.ts` and `types/next-auth.d.ts`; Phase 4 added `lib/clock.ts`, `lib/reports.ts`, `lib/queries/*` and `lib/actions/{shared,form-state,entities,credits,users}.ts`; Phase 5 rewrote `lib/reports.ts` and added `lib/report-strings.ts`, `lib/queries/reports.ts` and `components/reports/{report-pdf,report-form,report-table}.tsx`
- `i18n/{routing,navigation,request}.ts`, `messages/{es,en}.json`
- `prisma/{schema.prisma,seed.ts,migrations/}`, `prisma.config.ts`, `scripts/{migrate-from-mysql.ts,legacy-fixture.sql}`, `docker-compose.dev.yml`
- Phase 6 added `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.env.production.example`, `app/api/health/route.ts` and a `README.md` that is the deploy runbook

---

## 6. Verification

**Phase 1 (done):** build + lint clean; every route resolves in both locales; no missing-message warnings; ledger math checked against the rules; print rules verified.

**Phase 2 (done against a reconstructed fixture; repeat against the real dump):** `pnpm db:migrate-legacy --dry-run` first — it reports every blocking condition and writes nothing. Then run it for real and check that per-table row counts match MySQL, `SUM(credits.total)` matches, and every reported balance mismatch is understood before the database is used. Investigate mismatches — do not auto-correct.

**Phase 3 (done):** sign in, sign out, wrong password, and a deactivated account; the full route matrix for both roles in both locales; row scoping on the two shared screens; `last_login_at` written only on success. Two things are worth repeating on any auth change: neutralise `canAccess` in `proxy.ts` and confirm the pages still answer 403 on their own, and check the **production** build — `pnpm build && pnpm start` — because dev mode hid a total auth failure (`UntrustedHost`).

**Phase 4 (done against the seed; repeat against migrated data):** every step above was driven through the running app and then read back out of Postgres — see the phase entry for the figures. What is *not* done is the side-by-side diff against the legacy app on the same data, which needs the real dump. Re-run the sequence after the ETL: create a credit, pay to zero, void a mid-sequence payment, edit the principal, soft-delete, and submit a daily close, comparing each result against what `centauro_old` produces from the same input.

**Phase 5 (done against the seed):** the endpoint's auth matrix and every rejected filter; each report's figures read back out of the generated PDF and reconciled against `SUM`; both range ends; both locales; a three-page document from an injected fixture. Two things are worth repeating on any report change: read the PDF's text back rather than trusting that it rendered, and check that the screen table and the document still agree row for row — they share `reportColumns` precisely so that they must.

**Phase 6 (done locally; not done on the real host):** `docker compose up -d --build` on a cold volume, then a second `up` to confirm `migrate` is a no-op; the app reachable only through the compose network; the anonymous route matrix and a real sign-in through the login form against the built image; a report PDF out of the alpine container; the probe falling to 503 and recovering when Postgres stops and starts. Two things are worth repeating on any deployment change: **check that the image builds with no database reachable** — that is what caught the prerendered `/login` — and sign in against the *built* image rather than `pnpm start`, because `UntrustedHost` is invisible until then.

**Suggested test setup** — done: Vitest covers the ledger math (`recalculateBalances`, payoff/`bad_record` detection, void-cascade), the route policy, the daily-close formula and the clock.

---

## 7. Open risks and questions

- ~~**No schema dump yet.**~~ — the dump landed and the ETL has run against it (Phase 7). What it leaves open is the side-by-side parity diff against the running legacy app on the same data.
- **The list screens do not page, and the real volume makes that a go-live blocker.** Measured on a production build: `/payments` is 297 MB of HTML in 22.9 s over 57,131 rows, `/credits` 16.4 MB over 4,737. The derivation is correct and keeps list and detail in agreement — the fix is a `DISTINCT ON` projection plus a page size, not abandoning it.
- **Search and filter controls on the list screens are still inert**, which the volume above turns from an annoyance into part of the same blocker: with 57,131 payments and no search, there is no way to find one. `/reports` has working filters but its listing also renders every row.
- **The report PDFs use only the standard PDF fonts.** Now answerable: the real book holds 13 non-ASCII values and every one is `Ñ`, `ñ` or an accented vowel — all inside WinAnsi, so Helvetica covers the migrated names. A future client whose name leaves that range would still render blank.
- ~~**Hard-delete → soft-delete** for credits~~ — done; `deleteCredit` soft-deletes the credit and its ledger. Nothing in the app un-deletes one yet, so a mistaken delete needs SQL.
- ~~Old money columns are floats; some historical balances will not reconcile to the penny.~~ — the columns are `decimal(9,2)` and exact. Ten stored balances still disagree with their own entries (nine of them one cascade on credit 4257, ending at a stored −50.00); the import takes the recomputed value and reports every difference.
- ~~MySQL 5.7 is EOL and the compose file commits DB credentials in plaintext.~~ — the new stack takes every secret from the environment and refuses to start without it. **The old credentials are still in the repository history and must be rotated, not reused.**
- The mobile drawer (<1024px) has not been verified interactively.
- ~~**Row-level scoping is written against the mock data.**~~ — done; `Scope` is threaded through every read in `lib/queries/*`.
- `forbidden()` / `unauthorized()` depend on `experimental.authInterrupts`. It is the sanctioned mechanism in Next 16 but still flagged experimental; a Next upgrade should re-check the 403 path.
- `next-auth` is on `5.0.0-beta.32`. It declares Next 16 support and has been in beta a long while, but it is a beta on the login path.
- The design app pins older ranges (`@base-ui/react` 1.5, `lucide-react` 1.16) than what installed here (1.7, 1.31). No issues so far beyond the recharts 3 `Pie` behaviour noted above.
- **Nothing has been deployed to Dokploy.** The compose file assumes what the legacy stack implies: that Dokploy injects the Traefik labels, attaches `dokploy-network`, terminates TLS and sets `X-Forwarded-Host`. The last of those is not optional — Auth.js 500s without it, and it is the first thing to check on the first real deploy.
- **Built and run on arm64 only.** Nothing here ships a native binary, so an amd64 build should be uneventful, but it has not been done.
- **Backups are documented, not automated, and no restore has been rehearsed.** Neither project has ever had one. This is the largest operational gap left: the ETL is a one-way door onto a database with no proven recovery path.
- **The single Postgres container is the whole business.** One host, one volume, no replica. Adequate for the load, and worth being deliberate about rather than accidental.
- **The migrator image is 1.5 GB** because it carries the full toolchain for the ETL. Once the legacy import has happened for good, it could shrink to a production install, or go away.
