#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { startServer } from '@appercot/server'
import { createDatabase } from '@appercot/server/db'
import { Hub } from '@appercot/server/hub'
import { createMediaStorage } from '@appercot/server/media-storage'
import {
  acquireTestEnvironment,
  createTestControlApi,
  createTestFixtureOperations,
  drainFileDeletions,
  loadTestConfig,
  OperationBarrier,
  parseTestConfig,
  resolveTestConfig,
  seedTestFixtures,
  type TestBaseline,
} from '@appercot/server/test'

const configArgument = (argv: string[]) => {
  let config: string | undefined
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--config') {
      config = argv[index + 1]
      index += 1
      if (!config) throw new Error('--config requires a file path')
    } else throw new Error(`Unknown CLI argument: ${argv[index]}`)
  }
  return config ?? process.env.APPERCOT_CONFIG
}

const spaDirectory = (configured?: string) => {
  const candidates = [
    configured,
    resolve(process.cwd(), 'apps/web/dist'),
    resolve(process.cwd(), 'public'),
  ].filter((value): value is string => Boolean(value))
  const directory = candidates.find((candidate) => existsSync(join(candidate, 'index.html')))
  if (!directory)
    throw new Error('SPA index.html was not found; build apps/web or set server.publicDir')
  return directory
}

export const runTestServerCli = async (argv = process.argv.slice(2)) => {
  const configPath = configArgument(argv)
  const loaded = configPath
    ? await loadTestConfig(configPath)
    : resolveTestConfig(
        parseTestConfig({ test: { token: process.env.BOT_APPERCOT_TEST_TOKEN ?? '' } }),
        process.env,
      )
  const explicitDataDir = Boolean(loaded.config.server?.dataDir || process.env.DATA_DIR)
  const explicitPublicUrl = Boolean(loaded.config.server?.publicUrl || process.env.PUBLIC_URL)
  const publicDir = spaDirectory(loaded.publicDir)
  const environment = await acquireTestEnvironment(
    explicitDataDir ? loaded.env.DATA_DIR : undefined,
  )
  loaded.env.DATA_DIR = environment.directory
  const database = createDatabase(join(environment.directory, 'appercot.sqlite'))
  let server: ReturnType<typeof startServer> | undefined
  try {
    const baselinePath = join(environment.directory, 'baseline.json')
    const barrier = new OperationBarrier()
    const hub = new Hub()
    const storage = createMediaStorage(loaded.env, environment.s3Prefix)
    let baseline: TestBaseline
    const restore = existsSync(baselinePath)
    if (restore) {
      const persisted = JSON.parse(await readFile(baselinePath, 'utf8')) as Pick<
        TestBaseline,
        'manifest' | 'snapshot'
      >
      baseline = {
        ...persisted,
        fixtures: () => structuredClone(persisted.manifest),
      }
    } else {
      baseline = seedTestFixtures(database.db, loaded.env, loaded.config)
      await writeFile(
        baselinePath,
        JSON.stringify({ manifest: baseline.manifest, snapshot: baseline.snapshot }),
        { mode: 0o600 },
      )
    }
    const operations = createTestFixtureOperations({ db: database.db, hub, baseline, storage })
    if (restore) await operations.flushState()
    else await drainFileDeletions(database.db, storage)
    server = startServer({
      database,
      env: loaded.env,
      hostname: loaded.hostname,
      port: loaded.env.PORT,
      publicDir,
      mediaStoragePrefix: environment.s3Prefix,
      barrier,
      hub,
      testControl: createTestControlApi({
        token: loaded.config.test.token,
        operations,
        barrier,
        isReady: () => true,
      }),
    })
    const endpoint = explicitPublicUrl ? loaded.env.PUBLIC_URL : server.url.origin
    if (!explicitPublicUrl) loaded.env.PUBLIC_URL = endpoint
    console.log(JSON.stringify({ endpoint }))

    let shuttingDown = false
    const shutdown = async () => {
      if (shuttingDown) return
      shuttingDown = true
      await barrier.runReset(() => server?.stop(true))
      database.sqlite.close()
      await environment.release()
    }
    process.once('SIGINT', () => void shutdown())
    process.once('SIGTERM', () => void shutdown())
    process.stdin.once('end', () => void shutdown())
    process.stdin.resume()
  } catch (error) {
    server?.stop(true)
    database.sqlite.close()
    await environment.release()
    throw error
  }
}

if (import.meta.main) {
  runTestServerCli().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Test server failed to start')
    process.exitCode = 1
  })
}
