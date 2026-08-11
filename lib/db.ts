import 'server-only'

import { createPrismaClient } from '@/lib/prisma-client'
import type { PrismaClient } from '@/lib/generated/prisma/client'

// Next's dev server re-evaluates modules on every hot reload; without a global
// singleton the connection pool grows until Postgres refuses new clients.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
