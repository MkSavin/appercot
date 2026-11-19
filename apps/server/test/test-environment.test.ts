import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { acquireTestEnvironment, assertProductionDataDirectory } from '../src/test/environment'

describe('test environment directory ownership', () => {
  let directory: string

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'appercot-environment-'))
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  test('marks and exclusively locks an explicit empty directory until release', async () => {
    const environment = await acquireTestEnvironment(directory)
    expect(await readFile(join(directory, '.appercot-test.json'), 'utf8')).toContain('s3Prefix')
    expect(environment.s3Prefix).toStartWith('environments/')
    await expect(acquireTestEnvironment(directory)).rejects.toThrow(/locked|in use/i)
    await environment.release()

    const next = await acquireTestEnvironment(directory)
    expect(next.s3Prefix).toBe(environment.s3Prefix)
    await next.release()
  })

  test('refuses a nonempty unmarked directory and protects it from production startup', async () => {
    await writeFile(join(directory, 'user-data.txt'), 'keep')
    await expect(acquireTestEnvironment(directory)).rejects.toThrow(/unmarked|not empty/i)

    await rm(join(directory, 'user-data.txt'))
    const environment = await acquireTestEnvironment(directory)
    expect(() => assertProductionDataDirectory(directory)).toThrow(/test environment/i)
    await environment.release()
  })
})
