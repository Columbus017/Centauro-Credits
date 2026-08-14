# syntax=docker/dockerfile:1

# Centauro Créditos — production image.
#
# Two things ship from here, sharing every layer up to `deps`:
#
#   * `runner`   — the Next standalone server. No pnpm, no lockfile, no source,
#                  no dev dependencies; ~60 MB of traced files on top of Node.
#   * `migrator` — the full toolchain, run to completion before the app starts
#                  (`prisma migrate deploy`) and available for the one-shot ETL
#                  and the seed. See `docker-compose.yml`.
#
# The legacy image was `php:8.1-apache` with `COPY . /var/www/html/` — the whole
# repository, secrets included, served as the document root by root.

ARG NODE_IMAGE=node:24-alpine

# ---------------------------------------------------------------------------
# base — the toolchain both halves share.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base

# pnpm comes from the `packageManager` field via corepack, so the image cannot
# drift from the version the lockfile was written by.
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# ---------------------------------------------------------------------------
# deps — node_modules, cached against the lockfile alone.
# ---------------------------------------------------------------------------
FROM base AS deps

# `pnpm-workspace.yaml` carries the `allowBuilds` allowlist; without it pnpm
# refuses to run the native build scripts and the install exits non-zero.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# The `postinstall` hook is `prisma generate`, which reads the schema through
# `prisma.config.ts` — both have to be here before the install runs.
COPY prisma.config.ts ./
COPY prisma ./prisma

# Generation only parses the schema; it never opens a connection. The value is
# a placeholder so `prisma.config.ts` has something to read, and it is confined
# to this stage — the runner takes `DATABASE_URL` from the environment.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# builder — `next build`, producing `.next/standalone`.
# ---------------------------------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `lib/generated/prisma` is gitignored and so is not in the build context;
# regenerating here is cheaper than reasoning about which stage owns it.
RUN pnpm exec prisma generate

# The build imports every page module, and `lib/db.ts` constructs its client at
# module scope, so a build with no `DATABASE_URL` fails before it renders
# anything. Nothing connects: every route in this app is server-rendered on
# demand, because reading a session is reading a cookie.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---------------------------------------------------------------------------
# migrator — schema migrations, the seed, and the one-shot MySQL ETL.
# ---------------------------------------------------------------------------
FROM deps AS migrator

COPY . .
RUN pnpm exec prisma generate

# Overridden in the compose file for the seed and the ETL. `migrate deploy`
# applies committed migrations and never generates or resets one, which is the
# only form of the command that belongs near production data.
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# runner — what actually serves traffic.
# ---------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Docker sets `HOSTNAME` to the container id, and Next's standalone server
# binds to `process.env.HOSTNAME || '0.0.0.0'` — left alone it binds to a name
# that resolves to the loopback address and nothing can reach it.
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# The standalone bundle brings its own minimal `server.js` and only the
# `node_modules` files the traced routes import.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Neither is traced: `server.js` serves them from disk if they are put beside it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# The same endpoint Dokploy should watch. `--start-period` covers the first
# boot, when Postgres may still be accepting connections.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Next installs its own SIGTERM handler: in-flight requests finish and pending
# `after()` callbacks run before the process exits. Give it a drain period.
CMD ["node", "server.js"]
