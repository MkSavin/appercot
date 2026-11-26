# Testing

`@appercot/test` starts the real GraphQL API, WebSockets, SQLite, media storage, and built SPA. It does not replace the server with a mock.

The package has two parts:

- **`appercot-test-server` CLI** owns migrations, seed data, the HTTP/WebSocket server, and its data directory.
- **`AppercotTestClient`** is a small HTTP client that works in Bun, Vitest, Jest, or another JavaScript runner without importing runner APIs or Bun.

| Page                                          | Use it for                                                           |
| --------------------------------------------- | -------------------------------------------------------------------- |
| [Setup and lifecycle](setup.md)               | Building the SPA, starting the CLI, and connecting a test runner     |
| [Configuration and fixtures](fixtures.md)     | JSON configuration, placeholders, baseline IDs, and fixture creation |
| [Cleanup semantics](cleanup.md)               | Choosing flush or delete and understanding reset barriers            |
| [Runner compatibility](runners.md)            | Running the same scenario in Bun, Vitest, and Jest                   |
| [Browser testing](browser.md)                 | Playwright matrix, WCAG scans, stable selectors, and SPA reset       |
| [Manual release checklist](manual-release.md) | Physical-device PWA and screen-reader verification                   |

Keep independent parallel suites on separate endpoints and data directories. Never use the test control API against production.
