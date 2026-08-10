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

Package manager is pnpm (`packageManager: pnpm@11.20.0`). Single-package pnpm workspace (`pnpm-workspace.yaml`), not a monorepo. Native build scripts must be allowlisted under `allowBuilds:` in `pnpm-workspace.yaml` or `pnpm install` fails.

There is no test setup in this project yet.

## Architecture

- Next.js 16 App Router, React 19, TypeScript. Path alias `@/*` maps to the repo root.
- **Next.js 16 differs from earlier versions you may know from training** — check `node_modules/next/dist/docs/01-app/` for current conventions before writing App Router code. Notably the `middleware` file convention is deprecated in favour of **`proxy.ts`**, and typed route props (`LayoutProps<'/[locale]'>`, `PageProps<'/[locale]'>`) are globally available.
- Styling is Tailwind CSS v4, CSS-first — no `tailwind.config`. The whole token system (oklch light/dark palettes, sidebar/chart/status tokens) lives in `app/globals.css`.
- UI is shadcn `base-nova` over `@base-ui/react` in `components/ui/`, with `lucide-react` icons and `recharts` for charts. `components.json` configures the shadcn CLI.
- Theme: the `dark` class on `<html>` is owned by the DOM, set by an inline anti-FOUC script in `app/[locale]/layout.tsx` before hydration and persisted to `localStorage['centauro-theme']`. `components/theme-toggle.tsx` reads it via `useSyncExternalStore` + `MutationObserver` — do not mirror it into `useState`.

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
