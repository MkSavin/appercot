# Cleanup semantics

Choose the narrowest operation that gives the test a clean starting point.

| Operation        | Effect                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `flushState()`   | Revokes sessions and restores baseline IDs, credentials, chats, and history                                           |
| `flushUser(id)`  | Preserves the account, credentials, and owned bots; removes its sessions, push subscriptions, chats, and related data |
| `deleteUser(id)` | Also removes the account; owned bot ownership becomes `null` under the normal foreign-key rule                        |
| `flushChat(id)`  | Restores baseline membership, settings, and history, or clears a runtime chat while preserving current membership     |
| `deleteChat(id)` | Physically removes only that chat and its related data                                                                |

`flushUser` does not recreate baseline chats. Global update and outbox sequence numbers are not reused by state reset, preventing old clients from treating a reset as a valid continuation.

## Conflicts and missing fixtures

- Incompatible roles during chat restoration produce HTTP 409 with `TEST_FIXTURE_CONFLICT`.
- A missing fixture ID produces HTTP 404 with `TEST_FIXTURE_NOT_FOUND`.
- State requests arriving during a reset receive HTTP 503 with `TEST_RESET_IN_PROGRESS`.

`AppercotTestClientError` exposes `code`, optional HTTP `status`, and optional validation `path`. Network failures use `TEST_NETWORK_ERROR`; timeouts use `TEST_TIMEOUT` and have no HTTP status.

## Reset barrier and reconnects

Reset and delete operations are serialized. Affected sockets reconnect, and the SPA performs a full refresh through ordinary synchronization. A handler already running inside the bot process is not cancelled by a server reset. A surviving SDK connection can reconnect with its original baseline token after `flushState`.

Wait for asynchronous bot work before assuming history is empty. Use polling with a deadline rather than arbitrary sleeps when asserting a later reply.

## Media deletion

Only files and S3 keys registered by the environment are candidates for cleanup. Failed I/O remains recorded in SQLite as pending deletion, allowing the next cleanup to retry. This avoids deleting unrelated objects from a shared bucket or directory.

Do not run suites that reset the same endpoint concurrently. Use separate CLI processes, endpoints, and data directories for independent parallel work.
