# Browser testing

The Playwright suite drives the built SPA through visible controls and the same fixture API used by SDK tests. Five named projects run serially against the resettable server: `desktop-chromium`, `desktop-firefox`, `desktop-webkit`, `mobile-chromium`, and `mobile-webkit`.

```bash
export BOT_APPERCOT_TEST_ENDPOINT='http://127.0.0.1:12345'
export BOT_APPERCOT_TEST_TOKEN='test-control-token'
export ADMIN_PASSWORD='password123'
bun packages/test/node_modules/@playwright/test/cli.js install chromium firefox webkit
bun run --filter '@appercot/test' test:browser -- --project=desktop-chromium
bun run --filter '@appercot/test' test:browser
bun run --filter '@appercot/test' test:browser -- --headed --project=desktop-webkit
```

Use one project for quick iteration and the full matrix before release. Keep `workers: 1` while projects share an endpoint. CI runs the matrix after building the SPA and retains failure screenshots and axe reports. Full traces are disabled because Playwright network traces can contain login passwords and bot tokens; do not attach unsanitized traces.

Network-interception scenarios block service workers because mobile WebKit can bypass page routes for controlled pages. The dedicated PWA scenario enables the service worker explicitly. Touch-only WebKit checks do not require programmatic button/list focus, which iOS may reject outside a keyboard interaction; desktop projects still assert focus restoration and search-target focus.

## Automated coverage

- Login → chat → send → settings runs in every project.
- RU/EN selection works before and after authentication, survives reload, updates `html lang`, and is scanned at login, validation error, chat, notification menu, settings, dark theme, reduced motion, and catalog states.
- Axe checks `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` without global rule suppressions. Full violation details attach only on failure.
- Keyboard and layout scenarios cover Shift+Enter, IME-safe Enter, dialog/menu focus, narrow 320 px layouts, coarse-pointer targets, long URLs, history position, and incoming messages near and away from the tail.
- Onboarding runs the real echo SDK on desktop and mobile viewports: token copying and clipboard fallback, live presence, focus restoration, polling cleanup, opening the chat, and a real `/start` reply.
- Outbox scenarios exercise real IndexedDB and server history: draft reload, offline send followed by reconnect, a response lost after the server commit, two sending tabs, and denied-storage fallback. Final server counts prevent optimistic rows from hiding duplicates.
- Media scenarios upload real fixture files through XHR: mobile multi-file selection with one caption, previews, bounded progress, navigation during upload, keyboard cancel/retry, paste, drag-and-drop, object URL cleanup, and idempotent reload after a lost response.
- Notification scenarios cover mute reload and expiry, unread filtering, cross-tab resume, mobile profile/header synchronization, and keyboard focus return.
- Catalog scenarios cover query and tag filters, deep-linked details, unavailable bots, add failure and retry, single-chat creation under repeated CTA clicks, and existing-chat navigation.
- Message-search scenarios use more than 120 real messages: RU/EN content, result pagination, bounded context jumps, earlier/later/latest navigation, unread preservation, refresh, failure retry, mobile layout and keyboard focus. Search uses prefix token matching, not stemming or arbitrary substring matching.
- A Chromium-only service-worker scenario verifies that the production app shell reloads while the browser is offline.

Emulation does not prove physical-device safe areas, virtual keyboard behavior, installed PWA lifecycle, screen-reader output, push delivery, or codec support. Complete the [manual release checklist](manual-release.md) for those behaviors.

## Localization resources

Every namespace in `apps/web/src/shared/config/locales/ru` has an English mirror in `locales/en`. Add both resources with the same nested keys and interpolation variables. Use locale-specific i18next plural categories, numeric `count`, and `Trans` with React components for rich text rather than HTML in JSON. The localization test checks namespace/key parity, variables, empty values, RU/EN plurals, shared and React translations, and locale-aware dates.

The browser preference key is `appercot:locale:v1`; valid values are `ru` and `en`, with RU as default and fallback. It is independent of the account and survives logout. Push subscriptions carry the same allowlisted locale for server-generated fallback text; bot names and user content are not translated.

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

Use the typed registry in `apps/web/src/shared/lib/test-ids.ts` and the `testId(...)` helper for application changes. Do not select translated text, CSS layout classes, or element positions. Small helpers in `packages/test/test/browser/helpers.ts` provide fixture login, selectors, language switching, and axe assertions without hiding the user scenario.

```ts
import { testIds } from './path/to/test-ids'

const selector = (id: string) => `[data-test-id="${id}"]`

await page.locator(selector(testIds.auth.login.username)).fill(user.username)
await page.locator(selector(testIds.navigation.settings)).click()
```

Static IDs cover navigation, authentication, localization, history, search, composer, settings, and dialogs. Dynamic IDs use server IDs and zero-based keyboard button coordinates. Put the attribute on the actual interactive control and scope repeated dialog controls by their active container.

Before adding a selector or fixture, search the existing registry and test environment. Extend the shared contract instead of introducing a parallel naming scheme.
