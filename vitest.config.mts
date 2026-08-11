import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname) },
  },
  test: {
    // Node only. The ledger rules are server-side arithmetic; nothing here
    // needs a DOM, and Phase 4's Server Actions won't either.
    environment: 'node',
    include: ['{lib,scripts}/**/*.test.ts'],
  },
})
