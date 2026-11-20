import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const [version, tag, directory] = process.argv.slice(2)
const registry = 'https://registry.npmjs.org'
if (!version || !['beta', 'latest'].includes(tag) || !directory)
  throw new Error('Usage: node scripts/publish-sdk.mjs <version> <beta|latest> <directory>')
if (!process.env.NODE_AUTH_TOKEN) throw new Error('Set the NPM_TOKEN GitHub Actions secret')

for (const name of ['protocol', 'chat']) {
  const archive = join(directory, `appercot-${name}.tgz`)
  const spec = `@appercot/${name}@${version}`
  const integrity = `sha512-${createHash('sha512')
    .update(await readFile(archive))
    .digest('base64')}`
  const response = await fetch(`${registry}/@appercot%2f${name}/${encodeURIComponent(version)}`, {
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(15_000),
  })
  if (response.ok) {
    const published = await response.json()
    if (published.dist?.integrity !== integrity)
      throw new Error(`${spec} already exists with different contents. Use a new release version.`)
    console.log(`${spec} already published`)
    continue
  }
  if (response.status !== 404)
    throw new Error(`Could not read ${spec} from npm (HTTP ${response.status})`)

  const result = spawnSync(
    'npm',
    [
      'publish',
      archive,
      '--ignore-scripts',
      '--access',
      'public',
      '--tag',
      tag,
      '--registry',
      registry,
    ],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) throw result.error ?? new Error(`Could not publish ${spec}`)
}
