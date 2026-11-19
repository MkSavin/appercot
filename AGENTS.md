# Appercot

Self-hosted bot messenger and PWA. Bun serves GraphQL, WebSocket, files and the Vite/React SPA from SQLite. Start at [server entry](apps/server/src/index.ts) or [web entry](apps/web/src/app/index.tsx). Use `ls` to discover project files.

| Task or symptom                                                                  | Read                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Blank screen, chat jumps, message stays pending or push opens the wrong chat     | [Web](.agents/web.md)                                  |
| Session expires, roles or invitations fail, or a bot misses an event            | [Server](.agents/server.md)                            |
| SDK will not reconnect or a wizard button stopped working                        | [Bot SDK](.agents/sdk.md)                              |
| Add a frame, button, error or content type                                       | [Protocol](.agents/protocol.md)                        |
| Compiled executable will not find migrations or Enter submits during composition | [Platform workarounds](.agents/browser-workarounds.md) |
| Edit an anchor or comment                                                        | [Comments](.agents/comments.md)                        |
| Find known gaps                                                                  | [Open gaps](.agents/todo.md)                           |

## Never break

- Enforce session and resource ownership on the server. [Session and access](.agents/server.md)
- Keep repeat sends idempotent by chat and client ID. [Message delivery](.agents/server.md)
- Persist bot events before delivery and remove them on ACK. [Bot outbox](.agents/server.md)
- Isolate browser checkpoints by account and drop responses from ended sessions. [Synchronization](.agents/web/synchronization.md)
- Render bot Markdown without raw HTML. [Web](.agents/web.md)
- Validate wire payloads with shared schemas. [Protocol](.agents/protocol.md)

## UI changes

- Before implementing a component, search the existing shared, entity and widget components and reuse or generalize a suitable one first.
- Keep one public component per file. Small private one-off components and shadcn component collections may stay together; split large files into widgets, entity parts or local partials.
- Put interface text in namespaced JSON resources under `apps/web/src/shared/config/locales` and read it through `useTranslation` or the shared `i18n` instance outside React with keys such as `chat:online`.
- Use page-shaped placeholders for loading layouts instead of page loaders.

## Commands

- `bun run dev` starts the web client and server. [Setup](README.md)
- `bun run build` builds the SPA and standalone server.
- `bun test` runs tests.
- `bun run check` runs documentation checks, full lint, layer and GraphQL checks, types and tests.
- `bun run docs:index` regenerates the workaround index.
