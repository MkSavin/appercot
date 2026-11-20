# Test setup and lifecycle

## 1. Build and start the server

From the repository root:

```bash
bun run --filter '@appercot/web' build
export ADMIN_PASSWORD='test-admin-password'
export ALICE_PASSWORD='test-alice-password'
export ECHO_BOT_TOKEN='bot-echo:test-secret'
export BOT_APPERCOT_TEST_TOKEN='test-control-token'
bun --no-env-file packages/test/src/cli.ts --config examples/appercot.test.json
```

Use disposable credentials only. `--no-env-file` keeps Bun from loading the project's regular `.env`. Exported shell variables are still available, so use a shell with test settings. `--config` takes precedence over `APPERCOT_CONFIG`. To load a separate environment file, pass Bun's `--env-file` option before the script.

```bash
bun --env-file=.env.test packages/test/src/cli.ts \
  --config examples/appercot.test.json
```

After migrations, seeding, and listening, the CLI prints one JSON line to stdout:

```json
{ "endpoint": "http://127.0.0.1:12345" }
```

Diagnostics go to stderr. Export the endpoint and control token to the test process as `BOT_APPERCOT_TEST_ENDPOINT` and `BOT_APPERCOT_TEST_TOKEN`.

## 2. Connect the runner-agnostic client

```ts
import { AppercotTestClient } from '@appercot/test'

const appercot = new AppercotTestClient({
  endpoint: process.env.BOT_APPERCOT_TEST_ENDPOINT!,
  token: process.env.BOT_APPERCOT_TEST_TOKEN!,
  timeoutMs: 10_000,
})

beforeAll(() => appercot.ready())
beforeEach(() => appercot.flushState())
afterAll(() => bot.stop())
```

The browser needs only the endpoint. Keep the control token in the test process; do not expose it to page code.

## 3. Stop the CLI

Stop the CLI with SIGINT, SIGTERM, or by closing its stdin. SQLite and artifacts remain for diagnosis, while its directory lock is released. Restarting a marked data directory restores `baseline.json`, preserving original IDs and credentials.

The baseline contains test secrets. Protect it like a credential file and do not publish the data directory.

Next: [configuration and fixtures](fixtures.md).
