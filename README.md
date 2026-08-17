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
against the live MySQL. The `etl` profile in `docker-compose.yml` carries the
scratch MySQL 5.7 the copy is restored into, on this host, on the internal
network, with no published port. It starts only when asked for by name.

Run everything below from the project directory on the host. Under Dokploy that
is the checkout it deploys from (`/etc/dokploy/compose/<app>/code`), so
`docker compose` picks up the same environment the application runs with.

**1. Take the dump on the old host** — as the *root* user of its MySQL
container, over a `utf8mb4` connection. The charset is not a detail: the legacy
tables are `latin1` holding UTF-8 bytes, and reading them back the same way
phpMyAdmin did is what makes `Ñ` survive the round trip (see Phase 7 in
`MIGRATION_PLAN.md`). `--single-transaction` keeps it consistent without
locking anyone out.

```bash
# On the OLD host. The quoting is single: the variable is the container's.
docker exec centauro-mysql sh -c \
  'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction \
     --default-character-set=utf8mb4 --databases localdb' > db.sql
```

**2. Copy it to the new host** and restore it into the scratch container:

```bash
scp db.sql <new-host>:/etc/dokploy/compose/<app>/code/

docker compose --profile etl up -d mysql-legacy   # wait for it to report healthy
docker compose exec -T mysql-legacy sh -c \
  'exec mysql -u root -p"$MYSQL_ROOT_PASSWORD"' < db.sql
```

The dump issues its own `CREATE DATABASE localdb` and `USE localdb`, so no
database argument is needed and none should be given.

**3. Import.** Set `MYSQL_URL` (see `.env.production.example`), then:

```bash
docker compose run --rm migrate pnpm db:migrate-legacy --dry-run
docker compose run --rm migrate pnpm db:migrate-legacy
```

The dry run reports every blocking condition at once and writes nothing. The
real run is one transaction with a 30-minute budget — it lands whole or not at
all — and it reconciles itself afterwards, exiting non-zero if the row counts
or `SUM(principal)` disagree. Balance mismatches are pre-existing contradictions
in the legacy book: they are reported, never corrected. Read
`scripts/migrate-from-mysql.ts` and the Phase 2 and 7 sections of
`MIGRATION_PLAN.md` before running it for real.

Add `--force` to wipe and re-import a database that already holds credits —
which is exactly what the cutover does to the rehearsal data, and what must
never be run against a database anyone has since written to.

**4. Read it back.** The script checks row counts and `SUM(principal)`; these
are the figures it does not check, and the ones that prove the `bit(1)` flag
coercion landed. Payments must vastly outnumber originations, and the inactive
counts must not be zero:

```bash
docker compose exec -T postgres sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT kind, count(*), sum(amount) FROM ledger_entries GROUP BY kind;
SELECT count(*) FROM ledger_entries WHERE voided_at IS NOT NULL;
SELECT sum(collected), count(*) FROM daily_closes;
SELECT count(*) FROM customers WHERE NOT active;
SELECT count(*) FROM collectors WHERE NOT active;
SELECT last_name FROM customers WHERE last_name ~ '[^ -~]' LIMIT 5;
SQL
```

The last one is the encoding check: accented surnames must read as `Ordoñez`,
not `OrdoÃ±ez`. It was invisible in every count.

Finally, unset `MYSQL_URL` and take the scratch database down — it holds the
whole business in plaintext:

```bash
docker compose --profile etl rm -sfv mysql-legacy
```

Its data directory is anonymous and goes with it. **Never `down -v` here**: that
removes the volumes of the whole project, the production `postgres_data`
included.

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

## Cutover

Moving off `../centauro_old`. It runs in one order and each stage is finished
before the next begins; `MIGRATION_PLAN.md` §3 Phase 9 carries the reasoning.

**Before the window.** Deploy to a **temporary subdomain**, not the real one,
and rehearse the whole import above on it. Sign in as a real user — the
migrated `$2y$` hashes mean existing passwords work unchanged — and walk the
app: a credit's ledger, a payment, a daily close, a report PDF. Then diff the
same figures against the running legacy app on the same data. At the end of the
rehearsal the new system works on real but stale data, and the cutover is a
repeat of something that already worked on that machine.

Treat that subdomain as production the moment real data lands on it:
everything is behind the login, the `adminer` profile stays off, and the
address is not advertised.

**The window.**

0. Note the legacy dashboard's totals and two or three credit balances, to
   compare against afterwards.
1. **Freeze.** On the old host, `docker stop centauro-web`. The app is
   unreachable and nobody can write; MySQL stays up and readable.
2. **Final dump**, exactly as in step 1 of the import above, copied across.
3. **Restore and import** with `--force`, which wipes the rehearsal data. The
   rehearsal import took 8 seconds.
4. **Verify** — the script's own reconciliation, the queries above, and the
   figures from step 0. Sign in as an admin and as a collector.
5. **`pg_dump` immediately**, before the first real write, so there is a clean
   restore point.
6. **Switch DNS** and move the real domain onto the app in Dokploy.
7. Leave the old host **stopped but intact** for at least a month.

**Rollback** is DNS back plus `docker start centauro-web`, and it is valid right
up until someone records a payment in the new system. That write is the point of
no return — say so out loud before step 6.

**Afterwards.**

- `docker compose --profile etl rm -sfv mysql-legacy`, and unset `MYSQL_URL`.
- Delete every copy of `db.sql`, from both hosts and any laptop.
- Retire the temporary subdomain.
- **Schedule the backup.** The `pg_dump` above is now the only copy of the
  business, and nothing runs it on its own.
- Rotate the legacy credentials anywhere else they were used. All three are in
  the old repository's history.
