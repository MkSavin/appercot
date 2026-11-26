# Browser testing

The included Playwright scenario drives the built SPA through visible controls and the same fixture API used by SDK tests.

```bash
export BOT_APPERCOT_TEST_ENDPOINT='http://127.0.0.1:12345'
export BOT_APPERCOT_TEST_TOKEN='test-control-token'
export ADMIN_PASSWORD='password123'
bun run --filter '@appercot/test' test:browser
bun run --filter '@appercot/test' test:browser -- --headed
```

Chromium is headless by default. Install its Playwright browser binary with `bunx playwright install chromium` if the local installation has not done so already. `ADMIN_PASSWORD` must match the test-server owner password.

The onboarding scenarios run the real echo SDK on desktop and mobile viewports. They cover token copying and clipboard fallback, live presence, focus restoration, polling cleanup, opening the chat, and a real `/start` reply.

The outbox scenarios exercise real IndexedDB and server history: draft reload, offline send followed by reconnect, a response lost after the server commit, two sending tabs, and denied-storage fallback. They assert final server counts so an optimistic row alone cannot make a duplicate-prone test pass.

The media scenarios upload real fixture files through XHR. They cover mobile multi-file selection with one caption, previews, bounded progress, navigation during upload, keyboard cancel/retry, paste, drag-and-drop, object URL cleanup, and idempotent reload after a lost message response.

Notification scenarios cover mute reload and expiry, unread filtering, cross-tab resume, mobile profile/header synchronization, and keyboard focus return. Catalog scenarios cover query and tag filters, deep-linked details, unavailable bots, add failure and retry, single-chat creation under repeated CTA clicks, and existing-chat navigation.

Message-search scenarios use more than 120 real messages. They cover RU/EN content, result pagination, bounded context jumps, earlier/later/latest navigation, unread preservation, refresh, failure retry, mobile layout and keyboard focus. Search uses prefix token matching, not stemming or arbitrary substring matching.

## Reset before each scenario

```ts
const client = new AppercotTestClient({ endpoint, token })

test.beforeEach(async () => {
  await client.ready()
  await client.flushState()
})
```

Reset revokes old sessions and refreshes SPA synchronization. Create page state only after the reset completes. Keep browser tests serial when they share one endpoint.

## Use stable selectors

Use the typed registry in `apps/web/src/shared/lib/test-ids.ts` and the `testId(...)` helper for application changes. Do not select translated text, CSS layout classes, or element positions.

```ts
import { testIds } from './path/to/test-ids'

const selector = (id: string) => `[data-test-id="${id}"]`

await page.locator(selector(testIds.auth.login.username)).fill(user.username)
await page.locator(selector(testIds.navigation.settings)).click()
```

Static IDs cover navigation, authentication, search, composer, settings, and dialogs. Dynamic IDs use server IDs and zero-based keyboard button coordinates. Put the attribute on the actual interactive control and scope repeated dialog controls by their active container.

Before adding a selector or fixture, search the existing registry and test environment. Extend the shared contract instead of introducing a parallel naming scheme.
