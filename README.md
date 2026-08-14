# Centauro Créditos

The Next.js replacement for `../centauro_old`, the PHP/MySQL admin app of a
Guatemalan micro-credit business. Currency is GTQ (`Q`), the national ID is the
DPI, and the operators work in Spanish.

Architecture, conventions and domain rules are in [`CLAUDE.md`](./CLAUDE.md).
The port itself is tracked in [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md).

## Development

```bash
cp .env.example .env       # DATABASE_URL, AUTH_SECRET, MYSQL_URL
pnpm install
pnpm db:up                 # Postgres 16 on host port 5433
pnpm db:migrate            # apply migrations
pnpm db:seed               # development fixtures
pnpm dev                   # http://localhost:3000
```

Seeded logins (development only, password `centauro`): `mveliz` is the admin,
`cmejia` a collector, `bcastillo` a deactivated account.

`pnpm test` runs Vitest, `pnpm lint` ESLint, `pnpm typecheck` tsc.
**Check auth changes against `pnpm build && pnpm start`** — dev mode hides a
class of failure that only production hits.

## Deployment

Dokploy on a single host, from `docker-compose.yml`. It builds two targets out
of one `Dockerfile`:

| Service | Target | What it is |
| --- | --- | --- |
| `app` | `runner` | The Next standalone server. Non-root, no source, no pnpm. |
| `migrate` | `migrator` | One-shot `prisma migrate deploy`, run to completion before `app` starts. Also the container for the seed and the ETL. |
| `postgres` | — | `postgres:16` on a named volume, no published port. |
| `adminer` | — | Opt-in, `--profile tools`. Take it down again when finished. |

No Traefik labels and no `ports:` — Dokploy injects the routing and terminates
TLS. The app joins `dokploy-network` so Traefik can reach it.

### First deploy

1. Generate fresh secrets. **Do not reuse anything from the old stack**: its
   `docker-compose.yml` committed the MySQL root password, the application
   password and the phpMyAdmin credentials in plaintext, and they are in the
   repository history.

   ```bash
   openssl rand -hex 32       # POSTGRES_PASSWORD (hex: it goes inside a URL)
   openssl rand -base64 32    # AUTH_SECRET
   ```

2. Put every variable from [`.env.production.example`](./.env.production.example)
   into Dokploy's **Environment** tab. Compose refuses to start if one is
   missing, so a typo fails the deploy instead of silently taking a default.

3. Point the domain at the `app` service, port **3000**. Traefik must send
   `X-Forwarded-Host` and `X-Forwarded-Proto` — Auth.js answers `UntrustedHost`
   on every request otherwise, and it is a 500 that dev mode never shows.

4. Deploy. `migrate` applies the schema, then `app` starts.

Every later deploy is the same command: `migrate` re-runs, finds nothing
pending, and exits 0.

### Health

`GET /api/health` — `200` with `{"status":"ok","database":"up"}` when the app can
reach Postgres, `503` when it cannot. It is the container's own healthcheck and
what Dokploy should watch. It is public and says nothing else; `health.php`
published `DB_HOST`, `DB_NAME`, `DB_USER` and the server banner to anyone.

### Importing the legacy MySQL data

Once, into an empty database, from a restored **copy** of a `mysqldump` — never
against the live MySQL. Set `MYSQL_URL`, then:

```bash
docker compose run --rm migrate pnpm db:migrate-legacy --dry-run
docker compose run --rm migrate pnpm db:migrate-legacy
```

The dry run reports every blocking condition at once and writes nothing.
Balance mismatches are pre-existing corruption in the legacy floats: they are
reported, never corrected. Read `scripts/migrate-from-mysql.ts` and the Phase 2
section of `MIGRATION_PLAN.md` before running it for real, and unset `MYSQL_URL`
afterwards.

`docker compose run --rm migrate pnpm db:seed` loads the development fixtures
instead — it **wipes every table** and must never be pointed at production.

### Backups

Nothing here schedules one. The database is the whole business:

```bash
# The quoting is single on purpose: the variables are the container's, not
# the host shell's.
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > centauro-$(date +%F).sql.gz
```

Restore into an empty database with `psql`. Take one before any deploy that
carries a migration.
