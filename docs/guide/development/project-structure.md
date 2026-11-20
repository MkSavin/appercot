# Project structure

```text
appercot/
├── apps/
│   ├── server/          # Bun, GraphQL, domain, WebSockets, SQLite, media
│   └── web/             # React PWA using Feature-Sliced Design
├── packages/
│   ├── protocol/        # Shared Zod wire schemas and inferred types
│   ├── chat/            # Public bot SDK
│   └── test/            # Test CLI, client, compatibility, and Playwright
├── examples/
│   ├── echo-bot/        # Commands, callbacks, and storage
│   └── wizard-bot/      # Multi-step flow
├── docs/guide/          # Current English user and developer documentation
├── docs/superpowers/    # Design and implementation history
├── .agents/             # Contributor invariants and troubleshooting
└── scripts/             # Repository checks
```

## Dependency direction

`@appercot/protocol` owns wire schemas used by server, web, and SDK. GraphQL types and operations generate typed web client artifacts. Frontend Feature-Sliced dependencies flow from `app` through pages, widgets, features, and entities to `shared`.

Use each package's public entry point. Do not make bot applications depend on server internals or generated browser modules.

## Where to make common changes

| Change                                    | Start here                                      |
| ----------------------------------------- | ----------------------------------------------- |
| Bot event, RPC, or content type           | `packages/protocol`, then `.agents/protocol.md` |
| Authentication, membership, or invitation | `apps/server`, then `.agents/server/access.md`  |
| Bot reconnect, event, or flow behavior    | `packages/chat`, then `.agents/sdk.md`          |
| Chat rendering or synchronization         | `apps/web`, then `.agents/web.md`               |
| Stable browser selector                   | `apps/web/src/shared/lib/test-ids.ts`           |
| Test fixture or cleanup                   | `apps/server/src/test` and `packages/test`      |
| Public usage instructions                 | The smallest relevant page in `docs/guide`      |

Search existing components and fixtures before adding a parallel abstraction. Put interface text in namespaced web locale resources rather than hard-coding it in components.
