import { describe, expect, test } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const dataDir = `.test-data/packaging-${Bun.randomUUIDv7()}`

describe('standalone server packaging', () => {
  test('resolves migrations beside the compiled server when source files are absent', async () => {
    const moduleDir = resolve(dataDir, 'runtime')
    await mkdir(`${moduleDir}/drizzle`, { recursive: true })
    await writeFile(`${moduleDir}/drizzle/0000_migration.sql`, 'SELECT 1;')
    try {
      const client = (await import('../src/db/client')) as unknown as {
        resolveMigrationsFolder?: (directory: string) => string
      }
      expect(client.resolveMigrationsFolder?.(moduleDir)).toBe(resolve(moduleDir, 'drizzle'))
    } finally {
      await rm(dataDir, { recursive: true, force: true })
    }
  })

  // @anchor INV:packaging/uses-executable
  test('uses the executable directory instead of the Bun virtual filesystem', async () => {
    await mkdir(resolve(dataDir, 'dist/drizzle'), { recursive: true })
    try {
      const client = (await import('../src/db/client')) as unknown as {
        resolveMigrationsFolder?: (directory: string, executablePath: string) => string
      }
      for (const virtualDir of ['B:/~BUN/root', '/$bunfs/root']) {
        expect(
          client.resolveMigrationsFolder?.(virtualDir, resolve(dataDir, 'dist/appercot')),
        ).toBe(resolve(dataDir, 'dist/drizzle'))
      }
    } finally {
      await rm(dataDir, { recursive: true, force: true })
    }
  })
})
