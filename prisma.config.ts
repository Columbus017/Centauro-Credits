import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Development fixtures from `lib/mock-data.ts`. The real MySQL import is
    // `scripts/migrate-from-mysql.ts` and is deliberately not wired here.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // The CLI only ever runs migrations, which take an advisory lock and so
    // need a session the pooler will not hand out. `DIRECT_DATABASE_URL` is
    // set where a managed Postgres offers both; locally the two are the same
    // and only `DATABASE_URL` exists. See `lib/prisma-client.ts`.
    url: process.env['DIRECT_DATABASE_URL'] ?? process.env['DATABASE_URL'],
  },
})
