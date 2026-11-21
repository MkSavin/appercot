# Garage Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace local MinIO builds with Garage v2.5.0 and make the GHCR deployment the default `docker-compose.yml`.

**Architecture:** One official Garage container initializes its single-node layout, bucket, and access key. The application keeps its existing Bun S3 client and switches to Garage's path-style endpoint and region. The previous MinIO volume is left untouched; Garage uses a new volume.

**Tech Stack:** Docker Compose, Garage v2.5.0, Bun 1.4.3 S3Client, Bun test, TypeScript.

## Global Constraints

- Use `dxflrs/garage:v2.5.0`; do not add an npm dependency.
- Do not migrate, mount, delete, or reuse the old `appercot-media` MinIO volume.
- Keep S3 path-style access, multipart coverage, ranged reads, and presigned downloads working.
- `docker-compose.yml` is production; `docker-compose.dev.yml` builds the app from source.
- Do not overwrite the pre-existing user edit in `docs/guide/deployment/operations.md`; make only targeted Garage replacements there.
- Do not commit changes unless the user explicitly asks for a commit.

---

### Task 1: Garage configuration and real S3 integration tests

**Files:**

- Create: `garage.toml`
- Create: `apps/server/test/garage-config.ts`
- Create: `apps/server/scripts/test-garage.ts`
- Delete: `apps/server/test/minio-config.ts`
- Delete: `apps/server/scripts/test-minio.ts`
- Modify: `apps/server/test/media-transfer.test.ts:9,132-173`
- Modify: `package.json:13`

**Interfaces:**

- Produces: `garageTestConfig` with `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_REGION` string fields.
- Consumes: existing `APPERCOT_TEST_S3_ENDPOINT`, `createMediaStorage`, and `roundTrip` interfaces.

- [ ] **Step 1: Add the secret-free Garage configuration**

Create `garage.toml`:

```toml
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
metadata_auto_snapshot_interval = "6h"
replication_factor = 1

rpc_bind_addr = "[::]:3901"

[s3_api]
api_bind_addr = "[::]:3900"
s3_region = "garage"
```

The RPC secret comes from `GARAGE_RPC_SECRET`; no administration or website listener is configured.

- [ ] **Step 2: Add the failing Garage integration runner and test configuration**

Create `apps/server/test/garage-config.ts`:

```ts
export const garageTestConfig = {
  S3_BUCKET: 'appercot-test',
  S3_ACCESS_KEY_ID: 'GK0123456789abcdef0123456789abcdef',
  S3_SECRET_ACCESS_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  S3_REGION: 'garage',
}
```

Create `apps/server/scripts/test-garage.ts`:

```ts
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
```

Change the package script to:

```json
"test:garage": "bun --no-env-file apps/server/scripts/test-garage.ts",
```

Run `bun run test:garage` before changing the media test imports. Expected: FAIL because `apps/server/test/media-transfer.test.ts` still imports the MinIO configuration and its S3 settings lack Garage's region.

- [ ] **Step 3: Point the media test at Garage and add an explicit presigned-download assertion**

Replace the MinIO configuration import and S3 setup:

```ts
import { garageTestConfig } from './garage-config'
```

```ts
const endpoint = process.env.APPERCOT_TEST_S3_ENDPOINT
const garage = {
  ...garageTestConfig,
  S3_ENDPOINT: endpoint,
}
test.skipIf(!endpoint)(
  'performs the same media round trip with Garage',
  async () => {
    if (!endpoint) return
    await roundTrip({ ...garage, S3_ENDPOINT: endpoint })
  },
  25_000,
)
```

Use `loadEnv(garage)` in the multipart test. Immediately after `const boundary = 16 * chunkSize`, add:

```ts
const expectedBoundaryBytes = new Uint8Array([15, 15, 16, 16])
const signed = await fetch(storage.source('s3', id), {
  headers: { range: `bytes=${boundary - 2}-${boundary + 1}` },
})
expect(signed.status).toBe(206)
expect(await signed.bytes()).toEqual(expectedBoundaryBytes)
```

Use `expectedBoundaryBytes` in the existing `object.slice(...)` assertion as well.

- [ ] **Step 4: Run the real Garage tests**

Run: `bun run test:garage`

Expected: three media tests pass against the official Garage image, including the multipart boundary read and presigned ranged download. The runner stops its container and Docker `--rm` removes its anonymous volume.

- [ ] **Step 5: Remove the superseded MinIO test files and verify references**

Delete `apps/server/scripts/test-minio.ts` and `apps/server/test/minio-config.ts`. At this task's review gate, `bun run test:garage` must remain green and no active TypeScript file may import the deleted files.

---

### Task 2: Make production Compose the default and replace MinIO services

**Files:**

- Rename: `docker-compose.prod.yml` to `docker-compose.yml`
- Rename: previous `docker-compose.yml` to `docker-compose.dev.yml`
- Modify: both renamed Compose files
- Modify: `.env.example:17-24`
- Delete: `Dockerfile.minio`

**Interfaces:**

- Consumes: root `garage.toml` from Task 1.
- Produces: `garage` service at `http://garage:3900`, region `garage`, and named volume `garage-data`.

- [ ] **Step 1: Rename the Compose entry points**

Run:

```bash
mv docker-compose.yml docker-compose.dev.yml
mv docker-compose.prod.yml docker-compose.yml
```

Expected: production GHCR configuration is now the default, and the app-building configuration is `docker-compose.dev.yml`.

- [ ] **Step 2: Replace application dependencies and S3 settings in both files**

Use this dependency in both `app` services:

```yaml
depends_on:
  garage:
    condition: service_healthy
```

Use these application S3 values:

```yaml
S3_ENDPOINT: http://garage:3900
S3_BUCKET: ${S3_BUCKET:-appercot}
S3_REGION: garage
S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID:?Set S3_ACCESS_KEY_ID in .env}
S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY:?Set S3_SECRET_ACCESS_KEY in .env}
```

- [ ] **Step 3: Replace both MinIO service definitions with one Garage service**

Use the same service in both Compose files:

```yaml
garage:
  image: dxflrs/garage:v2.5.0
  command: /garage server --single-node --default-bucket
  restart: unless-stopped
  environment:
    GARAGE_RPC_SECRET: ${GARAGE_RPC_SECRET:?Set GARAGE_RPC_SECRET in .env}
    GARAGE_DEFAULT_ACCESS_KEY: ${S3_ACCESS_KEY_ID:?Set S3_ACCESS_KEY_ID in .env}
    GARAGE_DEFAULT_SECRET_KEY: ${S3_SECRET_ACCESS_KEY:?Set S3_SECRET_ACCESS_KEY in .env}
    GARAGE_DEFAULT_BUCKET: ${S3_BUCKET:-appercot}
  volumes:
    - ./garage.toml:/etc/garage.toml:ro
    - garage-data:/var/lib/garage
  healthcheck:
    test: ["CMD", "/garage", "status"]
    interval: 5s
    timeout: 3s
    retries: 12
    start_period: 5s
```

Replace `appercot-media` with `garage-data` in each file's top-level `volumes` map. Delete `Dockerfile.minio`; neither Compose file nor the test runner references it anymore. Do not publish ports `3900` or `3901` to the host. The production file no longer contains any `build:` entry, so production starts with `docker compose up -d` and updates all images with `docker compose pull`.

- [ ] **Step 4: Replace MinIO environment examples**

Use these entries in `.env.example`:

```dotenv
S3_ENDPOINT=
S3_BUCKET=appercot
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
GARAGE_RPC_SECRET=
```

Keep `S3_REGION=us-east-1` as the standalone default; Compose explicitly overrides it to `garage`.

- [ ] **Step 5: Validate both Compose models**

Run with disposable values:

```bash
APPERCOT_VERSION=v0.1.0-beta.1 DOMAIN=appercot.example \
ADMIN_PASSWORD=test-admin-password S3_ACCESS_KEY_ID=GK0123456789abcdef0123456789abcdef \
S3_SECRET_ACCESS_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
GARAGE_RPC_SECRET=1111111111111111111111111111111111111111111111111111111111111111 \
docker compose -f docker-compose.yml config --quiet
```

Run the same environment with `docker compose -f docker-compose.dev.yml config --quiet`.

Expected: both commands exit 0. Neither rendered model contains `minio`, `MINIO`, `Dockerfile.minio`, or `appercot-media`.

---

### Task 3: Align operational documentation with Garage and Compose names

**Files:**

- Modify: `README.md`
- Modify: `docs/guide/deployment/docker.md`
- Modify: `docs/guide/deployment/configuration.md`
- Modify: `docs/guide/deployment/backup-and-recovery.md`
- Modify: `docs/guide/deployment/operations.md`
- Modify: `docs/guide/deployment/index.md`
- Modify: `docs/guide/getting-started/requirements.md`
- Modify: `docs/guide/development/workflow.md`
- Modify: `docs/guide/ai/prompting.md`
- Modify: `.agents/server/media.md`

**Interfaces:**

- Consumes: final Compose filenames, service name, credentials, and test command from Tasks 1-2.

- [ ] **Step 1: Update production and development commands**

Use production commands without `-f` and without `--build`:

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs app garage caddy
```

Use development commands with the explicit file:

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Replace `bun run test:minio` with `bun run test:garage`. Explain that the runner pulls Garage, starts a disposable container and anonymous volume, and removes both at completion.

- [ ] **Step 2: Document credentials and startup behavior**

Replace MinIO password instructions with these three independent values:

```dotenv
S3_ACCESS_KEY_ID='GKreplace-with-16-random-hex-bytes'
S3_SECRET_ACCESS_KEY='replace-with-32-random-hex-bytes'
GARAGE_RPC_SECRET='replace-with-a-different-32-random-hex-bytes'
```

Document generation on an operator's machine:

```bash
printf 'GK%s\n' "$(openssl rand -hex 16)"
openssl rand -hex 32
openssl rand -hex 32
```

State that default keys and bucket initialize a new Garage metadata directory, that later rotation uses Garage administration rather than automatic Compose initialization, and that a single node has no redundancy.

Retain the distinction that `DOMAIN` configures Caddy while `PUBLIC_URL` is the application origin; Compose derives the latter as `https://${DOMAIN}`.

- [ ] **Step 3: Correct backup and recovery instructions**

Replace statements about `appercot-media` and MinIO with `garage-data`. Require a consistent copy of both `/var/lib/garage/meta` and `/var/lib/garage/data`, taken with Garage stopped or through a separately verified Garage-aware backup procedure. Do not suggest that copying object blocks alone is sufficient. Keep existing SQLite and TOTP instructions intact and preserve unrelated user edits.

- [ ] **Step 4: Update source guidance and terminology**

Replace MinIO-specific test names, source-release links, service names, and architecture descriptions with Garage equivalents. Link to `https://garagehq.deuxfleurs.fr/documentation/quick-start/` and `https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/` where useful. Update the development workflow's existing-instance link to `apps/server/test/garage-config.ts`.

- [ ] **Step 5: Check documentation and stale references**

Run:

```bash
bun run docs:check
```

Search the repository for `minio`, `MINIO`, `docker-compose.prod.yml`, `test:minio`, and `appercot-media`. Expected: matches remain only in the approved design/plan history or explicit statements that old MinIO data is not migrated; active commands and configuration contain none.

---

### Task 4: End-to-end verification

**Files:**

- Verify all files changed above; no new implementation files.

- [ ] **Step 1: Run focused checks**

Run:

```bash
bun run test:garage
bunx biome check apps/server/scripts/test-garage.ts apps/server/test/garage-config.ts apps/server/test/media-transfer.test.ts
bun run docs:check
git diff --check
```

Expected: all commands pass, including three Docker-backed media tests.

- [ ] **Step 2: Start the development stack**

Run with a disposable `.env` and an unused Compose project name:

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Expected: `garage` becomes healthy, default bucket initialization succeeds, `app` becomes healthy, and Caddy starts. Inspect `docker compose -f docker-compose.dev.yml ps` and logs if any dependency fails. Run the real media scenario against this stack or its Garage endpoint without exposing Garage publicly. Stop only the disposable project afterward and leave any pre-existing project and volumes untouched.

- [ ] **Step 3: Validate production delivery**

Run `docker compose pull`. Expected: GHCR app, Garage, and Caddy pull successfully. If GHCR still returns `unauthorized`, record that external blocker and do not claim a full production startup was verified. Garage itself must already be proven by Tasks 1 and 4 Step 2.

- [ ] **Step 4: Inspect the final workspace**

Run `git status --short` and review the diff. Expected: no generated logs, test output files, old MinIO implementation files, or changes to the old MinIO volume. Report test results and any registry limitation explicitly.
