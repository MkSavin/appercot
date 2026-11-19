# Bot Test Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a real Appercot server fixture for bot developers, with deterministic JSON seed, safe reset/delete operations, a runner-neutral client, stable SPA selectors and layout-independent shortcuts.

**Architecture:** `@appercot/test` exposes a fetch-only client from its main entry and a Bun-only CLI from its bin entry. Server-only configuration, seed and reset code lives under `apps/server/src/test`; only the CLI passes the resulting test-control handler into `startServer`. Reset/delete operations share a barrier that rejects new work, aborts or drains old work, closes affected sockets and performs SQLite changes before registered physical file removals.

**Tech Stack:** Bun, TypeScript, SQLite/Drizzle, Zod, React, existing `@appercot/protocol` and `@appercot/chat`, Bun tests plus Vitest/Jest/Playwright compatibility examples.

## Global Constraints

- Production startup never registers `/_appercot/test/*`, including when `NODE_ENV=test`.
- The main `@appercot/test` import contains no Bun API, runner API or server entry import.
- Preserve session/resource ownership, send idempotency, persisted bot outbox and shared payload validation.
- Never empty an arbitrary directory, S3 prefix or bucket; delete only registered environment objects.
- Put selector attributes on native interactive controls where applicable and keep visible/ARIA shortcut names logical.
- Each behavior follows RED → GREEN → refactor; run the focused test before and after implementation.

---

### Task 1: Layout-independent shortcuts

**Files:** `apps/web/src/shared/lib/shortcuts.ts`, `apps/web/test/command-palette.test.ts`.

**Interfaces:** Preserve `ShortcutCombination`, `matchesShortcut(event, shortcut)`, `displayShortcut` and `ariaShortcut`.

- [ ] Add failing tests for Russian `key` with `code: Slash`, `KeyA`/`Digit0`, recognized-code priority over conflicting `key`, unknown-code fallback, numpad Num Lock, modifiers, repeat, composition and AltGraph.
- [ ] Run `bun test apps/web/test/command-palette.test.ts` and confirm the new alias cases fail.
- [ ] Add a logical-key-to-physical-code matcher; use recognized `code` first, support `Slash`, `NumpadDivide`, letters and digits, and gate numpad digits with `NumLock`.
- [ ] Re-run the focused test, then run existing palette/button tests to verify reserved chords and bot-defined chords still use the same matcher.

### Task 2: Typed selector registry and SPA controls

**Files:** create `apps/web/src/shared/lib/test-ids.ts`; modify the login form, workspace navigation, chat/catalog search and items, composer, message rows/keyboards, command palette, bot settings and shared confirmation buttons; add `apps/web/test/test-ids.test.ts` and selector assertions to existing UI tests.

**Interfaces:** Export `testId` values and functions for `chats.item(id)`, `catalog.bot(id)`, `message.item(id)`, `message.button(id,row,column)`, `command-palette.command(name)` and `command-palette.button(id,row,column)`.

- [ ] Add failing registry tests for every static and dynamic value in the design.
- [ ] Implement the pure registry and export it from `shared/lib`.
- [ ] Add failing rendered-DOM assertions before attaching attributes to the actual inputs, links and buttons.
- [ ] Apply server IDs and zero-based row/column indices; reuse existing native controls and active-dialog scoping rather than adding wrapper elements.
- [ ] Run `bun test apps/web/test/test-ids.test.ts apps/web/test/ui.test.tsx apps/web/test/chat-interactions.test.tsx apps/web/test/command-palette.test.ts`.

### Task 3: Runner-neutral fixture client

**Files:** create `packages/test/package.json`, `packages/test/tsconfig.json`, `packages/test/src/index.ts`, `packages/test/src/client.ts`, `packages/test/src/types.ts`, `packages/test/test/client.test.ts`.

**Interfaces:** Export `AppercotTestClient`, `AppercotTestClientError`, fixture input/output types and the manifest type. Client methods are `ready`, `fixtures`, `createUser`, `createBot`, `createChat`, `sendMessage`, `flushChat`, `deleteChat`, `flushUser`, `deleteUser`, `flushState`.

- [ ] Add failing tests using injected standard `fetch`: authorization, JSON paths, typed returns, void cleanup methods, HTTP error mapping, optional error path, timeout abort and network error mapping.
- [ ] Run `bun test packages/test/test/client.test.ts` and confirm the module is missing.
- [ ] Implement constructor validation, optional timeout, caller `AbortSignal` composition and runner-independent request handling without importing the server.
- [ ] Re-run the client tests and check the built/client entry with Node as well as Bun.

### Task 4: Configuration expansion and strict schema

**Files:** create `apps/server/src/test/config.ts`, `apps/server/src/test/config-schema.ts`, `apps/server/test/test-config.test.ts`; minimally extend `apps/server/src/env.ts` to expose strict parsing for an already merged source.

**Interfaces:** `loadTestConfig(options)` returns expanded fixture config plus an `AppEnv` source; JSON paths in errors never include secret values.

- [ ] Add failing expansion tests for `$NAME`, `${NAME}`, `${NAME:-default}`, empty values, recursion only in strings, escaping, missing-variable paths and secret redaction.
- [ ] Implement expansion before validation, with environment overrides above JSON and built-in defaults below JSON.
- [ ] Add failing strict-schema tests for unknown keys, duplicate IDs/usernames, bad references, admin duplication, token/ID consistency, media/S3/VAPID constraints and production-only fixture sections.
- [ ] Implement schemas using existing protocol content/command/role constraints and existing `AppEnv` checks; resolve config paths relative to the config file and env paths relative to cwd.
- [ ] Run `bun test apps/server/test/test-config.test.ts apps/server/test/auth.test.ts`.

### Task 5: Deterministic seed and fixture mutations

**Files:** create `apps/server/src/test/fixtures.ts`, `apps/server/src/test/seed.ts`, `apps/server/test/test-fixtures.test.ts`.

**Interfaces:** Seed returns an immutable manifest with stable IDs and original credentials. Fixture operations expose create user/bot/chat, send as either side, and typed domain errors consumed by control HTTP.

- [ ] Add failing seed tests for explicit/generated IDs, hashed passwords/tokens, normal user and bot login, command seed, ordered text/keyboard history and empty outbox/updates after seed.
- [ ] Implement seed in one SQLite transaction after migrations and before listen; derive omitted IDs once and preserve bootstrap administrator identity in the baseline.
- [ ] Add failing runtime create/send tests for returned credentials, actor derivation, user client-ID retry and normal updates/outbox.
- [ ] Implement creation through domain rules and sending through `sendUserMessage`/`sendBotMessage` with the same hub as production requests.
- [ ] Run the focused fixture and existing messaging/bot WebSocket tests.

### Task 6: Reset semantics and registered physical deletion

**Files:** create `apps/server/src/test/reset.ts`, `apps/server/src/test/deletions.ts`; extend the SQLite schema/migration with pending physical deletions and fixture refresh markers as needed; modify `apps/server/src/domain/media-storage.ts`, `apps/server/src/domain/prune.ts`; add `apps/server/test/test-reset.test.ts`.

**Interfaces:** Reset service provides serialized `flushState`, `flushUser`, `deleteUser`, `flushChat`, `deleteChat`; pending deletions survive I/O failures and are retried on the next cleanup/startup.

- [ ] Add failing per-operation tests covering messages, KV, outbox, updates, sessions, files, profile preservation, bot owner behavior, neighboring entities and missing IDs.
- [ ] Implement transactional row changes and deletion registration; perform physical original/preview deletion only after commit and report incomplete cleanup.
- [ ] Add failing baseline restoration/conflict/idempotency tests, including runtime-created chat behavior and detached-file ownership.
- [ ] Implement baseline restoration without resetting global outbox/update sequences; insert a refresh marker that forces full SPA synchronization after chat/user cleanup.
- [ ] Run reset, files, synchronization and messaging tests.

### Task 7: Operation barrier, control API and CLI lifecycle

**Files:** create `apps/server/src/test/barrier.ts`, `apps/server/src/test/control.ts`, `packages/test/src/cli.ts`; modify `apps/server/src/index.ts`, HTTP routing, WebSocket handlers/hub, callbacks, media previews and rate limiters; add `apps/server/test/test-control.test.ts` and CLI integration tests.

**Interfaces:** `startServer` accepts optional test-control hooks but production callers do not provide them. Control routes all require bearer auth and `Cache-Control: no-store`.

- [ ] Add failing auth tests for missing/wrong token and `ready`, constant-time hash comparison, production 404 before SPA fallback and no-store responses.
- [ ] Implement control routing only when explicitly supplied, with `401`, `404 TEST_FIXTURE_NOT_FOUND`, `409 TEST_FIXTURE_CONFLICT`, `503 TEST_RESET_IN_PROGRESS` and I/O error JSON.
- [ ] Add failing race tests for GraphQL, bot RPC/ACK, upload/preview, callbacks and prune; verify old close handlers cannot publish stale presence.
- [ ] Implement the barrier with epoch checks, operation abort/drain, socket revocation, callback cancellation, background drain and rate-limit reset; keep WebSocket frame handlers inside the same barrier.
- [ ] Add failing CLI tests for stdout JSON after listen, stderr diagnostics, missing SPA `index.html`, occupied/nonempty unmarked dataDir, test marker rejection by production, exclusive lock, port 0/public URL and shutdown cleanup.
- [ ] Implement CLI config precedence, temporary or marked dataDir, lock/marker/S3 prefix metadata, built SPA discovery, signal shutdown and preserved artifacts.
- [ ] Run control/static/packaging/media tests and a real CLI smoke test.

### Task 8: End-to-end SDK, SPA and runner compatibility

**Files:** create shared runner scenarios and thin Bun/Vitest/Jest entries under `packages/test/test/compatibility`; add a Playwright example and safe `examples/appercot.test.json`; extend web synchronization tests if reset exposes a checkpoint race.

**Interfaces:** All runners consume the same `AppercotTestClient` client and separately started CLI; browser tests use only registry selectors.

- [ ] Add a failing real CLI/SDK scenario for configured token, command, callback and reconnect after reset.
- [ ] Implement only defects exposed by that scenario, preserving running bot handlers across transport reconnect.
- [ ] Add the same lifecycle scenario to Bun, Vitest and Jest entry points using their native hooks.
- [ ] Add default-headless Playwright login/chat/command flows and verify `--headed` remains a runner option, not a server option.
- [ ] Test SPA full refresh after neighboring-chat checkpoints and stale history response rejection; fix the store only with a failing regression test.

### Task 9: Documentation and final verification

**Files:** `README.md`, `.agents/sdk.md`, `.agents/web.md`, `AGENTS.md` and the safe example config.

- [ ] Document CLI/env/config, Bun/Vitest/Jest lifecycle, Playwright modes, exact reset semantics and artifact/parallel-suite rules.
- [ ] Document the selector registry and layout-independent shortcut rules, including “reuse an existing fixture/selector first”.
- [ ] Run `bun run check` and `bun run build` on the final deliverable.
- [ ] Run real Bun/Vitest/Jest compatibility scenarios and the Playwright example where its browser is installed; report any unavailable external runner plainly.
- [ ] Inspect `git status`, remove only generated artifacts not needed for the deliverable and summarize the initial preservation commit separately from implementation changes.
