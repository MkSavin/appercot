# Runner compatibility

The same integration scenario can run under Bun, Vitest, and Jest because `AppercotTestClient` uses standard `fetch`, timers, and typed HTTP calls.

## Run the included compatibility suite

From the repository root:

```bash
bun run --filter '@appercot/test' test:compatibility
```

The runner creates a temporary configuration, starts its own CLI process, passes the printed endpoint and control token to each runner, and removes the temporary directory during teardown. It does not reuse `BOT_APPERCOT_TEST_ENDPOINT` from your shell.

The scenario covers a command, callback, chat reset, and SDK reconnect against real server state. The external CLI compatibility case is intentionally separate from ordinary `bun test` discovery.

## Adapt it to another runner

Use runner hooks only in the test file, not in shared scenario code:

```ts
export async function scenario(client: AppercotTestClient) {
  await client.ready()
  const before = await client.fixtures()
  await client.flushState()
  const after = await client.fixtures()
  // Assert with the runner or node:assert/strict.
}
```

Inject a custom standard `fetch` implementation through `AppercotTestClientOptions.fetch` only when the runtime requires it. The default is `globalThis.fetch`.

Stop every SDK instance in teardown. Otherwise a live socket can keep a runner process open or reconnect during a later reset.

For UI coverage, continue with [browser testing](browser.md).
