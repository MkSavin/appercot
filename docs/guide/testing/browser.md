# Browser testing

The included Playwright scenario drives the built SPA through visible controls and the same fixture API used by SDK tests.

```bash
export BOT_APPERCOT_TEST_ENDPOINT='http://127.0.0.1:12345'
export BOT_APPERCOT_TEST_TOKEN='test-control-token'
bun run --filter '@appercot/test' test:browser
bun run --filter '@appercot/test' test:browser -- --headed
```

Chromium is headless by default. Install its Playwright browser binary if the local installation has not done so already.

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
