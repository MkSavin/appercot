import { resolve } from 'node:path'
import { $ } from 'bun'
import { minioTestConfig } from '../test/minio-config'

const workspace = resolve(import.meta.dir, '../../..')
const image = 'appercot-minio:test'
const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = minioTestConfig

const waitUntilReady = async (endpoint: string) => {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const ready = await fetch(`${endpoint}/minio/health/ready`, {
      signal: AbortSignal.timeout(1000),
    }).then(
      (response) => response.ok,
      () => false,
    )
    if (ready) return
    await Bun.sleep(250)
  }
  throw new Error('MinIO did not become ready within 30 seconds')
}

await $`docker build --file Dockerfile.minio --tag ${image} .`.cwd(workspace)
const containerOptions = [
  '--detach',
  '--rm',
  '--publish',
  '127.0.0.1::9000',
  '--env',
  `MINIO_ROOT_USER=${S3_ACCESS_KEY_ID}`,
  '--env',
  `MINIO_ROOT_PASSWORD=${S3_SECRET_ACCESS_KEY}`,
  '--env',
  'MINIO_BROWSER=off',
]
const container = (await $`docker run ${containerOptions} ${image} server /data`.text()).trim()

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
  const address = (await $`docker port ${container} 9000/tcp`.text()).trim()
  const endpoint = `http://${address}`
  await waitUntilReady(endpoint)
  await $`docker exec ${container} mc alias set local http://127.0.0.1:9000 ${S3_ACCESS_KEY_ID} ${S3_SECRET_ACCESS_KEY}`
  await $`docker exec ${container} mc mb local/${S3_BUCKET}`
  await $`${process.execPath} --no-env-file test apps/server/test/media-transfer.test.ts`
    .cwd(workspace)
    .env({ ...process.env, APPERCOT_TEST_S3_ENDPOINT: endpoint })
} finally {
  await stop()
  process.off('SIGINT', interrupt)
  process.off('SIGTERM', terminate)
}
