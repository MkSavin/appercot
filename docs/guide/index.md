# Appercot guide

**Appercot is a self-hosted bot messenger and installable web application.** Its primary goal is to provide an independent service: your deployment owns the accounts, bot tokens, conversations, files, availability policy, and upgrade schedule.

Use Appercot when a bot needs more than a hosted chat account. It combines a Bun server, SQLite, GraphQL, WebSockets, a React PWA, and a TypeScript bot SDK in one deployable system. You can run it on your own hardware or a virtual server without depending on Telegram or another messenger to host your bots.

## Start here

| If you want to...                           | Read                                                      |
| ------------------------------------------- | --------------------------------------------------------- |
| Run Appercot locally                        | [Local development](getting-started/local-development.md) |
| Connect your first bot                      | [Your first bot](getting-started/first-bot.md)            |
| Understand the system                       | [Architecture](concepts/architecture.md)                  |
| Compare Appercot with Telegram              | [Why independence matters](concepts/independence.md)      |
| Build a bot with commands, flows, or files  | [Bot development](bots/index.md)                          |
| Test against the real server                | [Testing](testing/index.md)                               |
| Deploy with HTTPS                           | [Docker deployment](deployment/docker.md)                 |
| Use this documentation from an AI assistant | [Context7](ai/context7.md)                                |
| Change Appercot itself                      | [Development](development/index.md)                       |

## What is available now

- Signed-in and guest access to bots, including role-scoped commands.
- Shared chats, deep-linked bot catalog details, invitations, bounded message history with per-chat full-text search, and Web Push with per-chat modes and temporary mute.
- Bot commands, callbacks, keyboards, multi-step flows, Markdown, and file delivery.
- Local disk or S3-compatible media storage.
- Multi-file composer uploads with previews, progress, cancellation, retry, paste, and drag-and-drop.
- A real test server with seeded fixtures and explicit cleanup operations.
- Browser drafts and an unsent-message outbox that survive reloads and reconnects.
- Bun, Vitest, Jest, and Playwright compatibility scenarios.

The current product is a bot messenger, not a general-purpose replacement for every messenger feature. Web applications inside the bot shell are a future mode. Raw file and Blob uploads do not survive a browser restart. Do not assume end-to-end encryption, multi-node SQLite deployment, or guaranteed browser support for every video codec.

## Documentation map

- [Getting started](getting-started/index.md): requirements, local setup, and a working bot.
- [Concepts](concepts/index.md): architecture, independence, and security boundaries.
- [Bot development](bots/index.md): connections, events, commands, flows, media, and roles.
- [Testing](testing/index.md): lifecycle, fixtures, cleanup, runners, and browser automation.
- [Deployment](deployment/index.md): Docker, configuration, backup, and routine operations.
- [Development](development/index.md): repository layout, verification, and documentation maintenance.
- [AI assistants](ai/index.md): Context7 setup and effective prompts.

## Important operating rules

1. Keep `.env`, bot tokens, test control tokens, and `DATA_DIR/totp.key` secret.
2. Never expose the test control API in production. Only the test CLI enables it.
3. Back up SQLite and media together. Include `totp.key` when two-factor authentication is used.
4. Use the public SDK APIs documented here rather than server internals.
5. Treat this guide as the current usage reference. Design notes under `docs/superpowers` describe historical decisions, not the supported interface.

For contributor invariants and source-level troubleshooting, start with [AGENTS.md](../../AGENTS.md).
