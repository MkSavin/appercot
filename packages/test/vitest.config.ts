import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: import.meta.dir,
  test: {
    include: ['test/compatibility/vitest.entry.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
