import { resolve } from 'node:path'
import { $ } from 'bun'
import { garageTestConfig } from '../test/garage-config'

const workspace = resolve(import.meta.dir, '../../..')
const configPath = resolve(workspace, 'garage.toml').replaceAll('\\', '/')
const image = 'dxflrs/garage:v2.5.0'
const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = garageTestConfig

const waitUntilReady = async (container: string) => {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const ready = await $`docker exec ${container} /garage status`.nothrow().quiet()
    if (ready.exitCode === 0) return
    await Bun.sleep(250)
  }
  throw new Error('Garage did not become ready within 30 seconds')
}

const containerOptions = [
  '--detach',
  '--rm',
  '--publish',
  '127.0.0.1::3900',
  '--volume',
  `${configPath}:/etc/garage.toml:ro`,
  '--volume',
  '/var/lib/garage',
  '--env',
  `GARAGE_RPC_SECRET=${'1'.repeat(64)}`,
  '--env',
  `GARAGE_DEFAULT_ACCESS_KEY=${S3_ACCESS_KEY_ID}`,
  '--env',
  `GARAGE_DEFAULT_SECRET_KEY=${S3_SECRET_ACCESS_KEY}`,
  '--env',
  `GARAGE_DEFAULT_BUCKET=${S3_BUCKET}`,
]
const container = (
  await $`docker run ${containerOptions} ${image} /garage server --single-node --default-bucket`.text()
).trim()

let stopping: Promise<void> | undefined
const stop = () =>
  (stopping ??= $`docker stop --time 5 ${container}`
    .nothrow()
    .quiet()
    .then((result) => {
      if (result.exitCode !== 0) {
        console.error(result.stderr.toString().trim())
        process.exitCode = 1
      }
    }))
const interrupt = () => void stop().finally(() => process.exit(130))
const terminate = () => void stop().finally(() => process.exit(143))
process.once('SIGINT', interrupt)
process.once('SIGTERM', terminate)

try {
  await waitUntilReady(container)
  const address = (await $`docker port ${container} 3900/tcp`.text()).trim()
  const endpoint = `http://${address}`
  await $`${process.execPath} --no-env-file test apps/server/test/media-transfer.test.ts`
    .cwd(workspace)
    .env({ ...process.env, APPERCOT_TEST_S3_ENDPOINT: endpoint })
} finally {
  await stop()
  process.off('SIGINT', interrupt)
  process.off('SIGTERM', terminate)
}
