import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, open, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const markerName = '.appercot-test.json'
const lockName = '.appercot-test.lock'

interface TestMarker {
  id: string
  s3Prefix: string
}

export const assertProductionDataDirectory = (directory: string) => {
  if (existsSync(join(resolve(directory), markerName)))
    throw new Error('Production server cannot open a test environment data directory')
}

export const acquireTestEnvironment = async (explicitDirectory?: string) => {
  const temporary = !explicitDirectory
  const directory = explicitDirectory
    ? resolve(explicitDirectory)
    : await mkdtemp(join(tmpdir(), 'appercot-test-'))
  if (!temporary) {
    await mkdir(directory, { recursive: true })
    const entries = await readdir(directory)
    if (entries.length && !entries.includes(markerName)) {
      throw new Error(`Test data directory is nonempty and unmarked: ${directory}`)
    }
  }
  let marker: TestMarker
  const markerPath = join(directory, markerName)
  if (existsSync(markerPath)) {
    try {
      marker = JSON.parse(await readFile(markerPath, 'utf8')) as TestMarker
    } catch (error) {
      throw new Error(`Invalid test environment marker: ${directory}`, { cause: error })
    }
    if (!marker.id || !marker.s3Prefix)
      throw new Error(`Invalid test environment marker: ${directory}`)
  } else {
    marker = { id: Bun.randomUUIDv7(), s3Prefix: `environments/${Bun.randomUUIDv7()}/` }
  }
  let lock: Awaited<ReturnType<typeof open>> | undefined
  try {
    lock = await open(join(directory, lockName), 'wx')
    await lock.writeFile(String(process.pid))
    if (!existsSync(join(directory, markerName))) {
      await writeFile(join(directory, markerName), JSON.stringify(marker, null, 2), { mode: 0o600 })
    }
  } catch (error) {
    await lock?.close().catch(() => {})
    throw new Error(`Test data directory is locked or in use: ${directory}`, { cause: error })
  }
  await lock.close()
  let released = false
  return {
    directory,
    s3Prefix: marker.s3Prefix,
    release: async () => {
      if (released) return
      released = true
      await unlink(join(directory, lockName)).catch(() => {})
    },
  }
}
