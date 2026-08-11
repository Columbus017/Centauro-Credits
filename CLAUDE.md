# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Centauro Créditos — the Next.js replacement for a legacy PHP/MySQL lending & collections admin app (`../centauro_old`). The business is a Guatemalan micro-credit operation: currency is **GTQ (`Q`)**, national ID is **DPI**, and the operators work in Spanish.

The visual design comes from `../centauro_assets/uploads/lending-administration-dashboard/`, a complete reference Next.js app. Port its layout and design tokens — **not** its data model, which was drawn for a generic US lending product (USD, credit scores, amortization schedules, per-credit rate/term). None of that exists in the real domain.

## Commands

- `pnpm dev` — start the dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm start` — run the production build
- `pnpm lint` — run ESLint (flat config via `eslint.config.mjs`)
- `pnpm test` — Vitest (`lib/**/*.test.ts`); `pnpm typecheck` — `tsc --noEmit`
- `pnpm db:up` — local Postgres 16 via `docker-compose.dev.yml` (host port **5433**; 5432 is often taken)
- `pnpm db:migrate` — create/apply a Prisma migration; `pnpm db:seed` — load `lib/mock-data.ts`
- `pnpm db:migrate-legacy` — the one-shot MySQL → Postgres ETL (see below)

Copy `.env.example` to `.env` before any database command. It also holds `AUTH_SECRET`, without which nothing behind the login renders.

Every seeded user's password is `centauro` (development only): `mveliz` is the admin, `cmejia` a collector, `bcastillo` a deactivated account.

Package manager is pnpm (`packageManager: pnpm@11.20.0`). Single-package pnpm workspace (`pnpm-workspace.yaml`), not a monorepo. Native build scripts must be allowlisted under `allowBuilds:` in `pnpm-workspace.yaml` or `pnpm install` fails.

There is no test setup in this project yet.

## Architecture

- Next.js 16 App Router, React 19, TypeScript. Path alias `@/*` maps to the repo root.
- **Next.js 16 differs from earlier versions you may know from training** — check `node_modules/next/dist/docs/01-app/` for current conventions before writing App Router code. Notably the `middleware` file convention is deprecated in favour of **`proxy.ts`**, and typed route props (`LayoutProps<'/[locale]'>`, `PageProps<'/[locale]'>`) are globally available.
- Styling is Tailwind CSS v4, CSS-first — no `tailwind.config`. The whole token system (oklch light/dark palettes, sidebar/chart/status tokens) lives in `app/globals.css`.
- UI is shadcn `base-nova` over `@base-ui/react` in `components/ui/`, with `lucide-react` icons and `recharts` for charts. `components.json` configures the shadcn CLI.
- Theme: the `dark` class on `<html>` is owned by the DOM, set by an inline anti-FOUC script in `app/[locale]/layout.tsx` before hydration and persisted to `localStorage['centauro-theme']`. `components/theme-toggle.tsx` reads it via `useSyncExternalStore` + `MutationObserver` — do not mirror it into `useState`.

### Database

PostgreSQL 16 through Prisma 7. Three things about Prisma 7 differ from older versions you may know:

- The generator is **`prisma-client`** (not `prisma-client-js`) and emits to `lib/generated/prisma/`, which is gitignored and rebuilt by the `postinstall` hook. Import from `@/lib/generated/prisma/client`.
- The connection URL lives in **`prisma.config.ts`**, not in a `datasource` block or `package.json`.
- The client needs a **driver adapter**: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`. `lib/prisma-client.ts` is the only place that constructs one.

Use `db` from `@/lib/db` in application code — it is `server-only` and keeps one pooled client across hot reloads. Plain Node scripts (the seed, the ETL) must call `createPrismaClient()` from `@/lib/prisma-client` instead, since `server-only` throws outside the Next bundler.

**All ledger arithmetic goes through `lib/ledger.ts`.** Money is handled there in integer centavos — the legacy columns were floats and the drift is visible in the data. Nothing else should re-derive a running balance, a payoff total, or the bad-record flag; the legacy app copy-pasted that math into four PHP files and they drifted apart.

Schema conventions: tables and columns are `snake_case` via `@@map`/`@map`, money is `Decimal(12,2)`, dates that carry no time are `@db.Date` (build them with `isoDate()` from `@/lib/db-utils`, never `new Date(iso)`), and audit columns are `timestamptz`. The old `state`/`cancel`/`balpay` integer flags are gone — a row records *when* something happened (`voided_at`, `cancelled_at`, `deleted_at`).

`prisma/seed.ts` loads development fixtures from `lib/mock-data.ts` and wipes every table first. The production import is `scripts/migrate-from-mysql.ts`, which is a different thing entirely: it preserves original primary keys, reports data problems without correcting them, and refuses to write into a non-empty database. Run it only against a restored **copy** of a `mysqldump`. `scripts/legacy-fixture.sql` holds the reconstructed legacy DDL plus dirty fixture data for exercising it.

### Auth

Auth.js v5 (`next-auth@beta`) with a Credentials provider and a JWT session — no session table. The session carries `role` and `collectorId`; passwords are the legacy PHP `$2y$` bcrypt hashes, verified by `bcryptjs` and never reset.

The config is split on purpose. `lib/auth.config.ts` is the half that touches no database, so `proxy.ts` can read the session cookie on every request without bundling Prisma; `lib/auth.ts` adds the provider and is the only module that queries `users`.

Authorization runs in three layers, and only the third existed in the legacy app:

1. **`proxy.ts`** — optimistic, cookie-only. Redirects to `/login` without a session and rewrites a role that overreaches to `/denied`, which calls `forbidden()` so the answer is a real 403 at the requested URL.
2. **`lib/session.ts`** — `requireUser()` / `requireAdmin()` / `requireCollector()`, called at the top of every page. **This is the layer that protects data**; it holds even if the proxy is bypassed. Server Actions must call one too. Route access is not row access — a screen both roles can open must also check that the row belongs to the caller.
3. **`app-shell.tsx`** — the `nav` filter. Presentation only.

`lib/roles.ts` is the shared route policy (`canAccess`, `roleHome`, `stripLocale`), with tests. Add a route there and to the page's own guard, not to one or the other.

`forbidden()` / `unauthorized()` need `experimental.authInterrupts` in `next.config.ts`. They render through Next's own error shell rather than `app/[locale]/layout.tsx`, which is why `AuthNotice` carries its own `ThemeSync`.

`trustHost: true` is required: without it Auth.js answers `UntrustedHost` on every production request. Dev mode hides this — check auth changes with `pnpm build && pnpm start`.

### i18n

`next-intl` with `es` (default) and `en`. All routes live under `app/[locale]/`.

- **URL paths stay in English and are never localized** (`/clients`, `/credits`) — only content is translated.
- `localePrefix: 'as-needed'` → Spanish at `/`, English at `/en/…`.
- `localeDetection: false` → `/` is always Spanish regardless of `accept-language`; switching locale persists via the locale cookie.
- Import `Link`, `redirect`, `usePathname`, `useRouter` from `@/i18n/navigation`, **not** from `next/link` or `next/navigation`.
- Every user-facing string goes in `messages/es.json` + `messages/en.json` as it is written. No hardcoded copy.
- Server components must call `setRequestLocale(locale)` before using translations so they stay statically renderable.

## Domain notes

The old app's rules are the product; port them faithfully rather than "improving" them:

- A credit's payoff total is `principal × 1.15` (flat 15%, no per-credit rate or term).
- Payments are an append-only ledger. The first row per credit is the *origination*; later rows are payments carrying a denormalized running balance. Voiding a payment re-derives every later balance.
- A credit becomes `cancelled` when its balance reaches 0, and is flagged `badRecord` if payoff took more than 30 days.
- Two roles only: `admin` and `collector` (the old `user.permissions` 0/1). Collectors see only their own field screens.

`components/status-badge.tsx` defines the complete real status set — `active`, `inactive`, `cancelled`, `badRecord`, `posted`, `voided`. Do not reintroduce the mockup's states.
