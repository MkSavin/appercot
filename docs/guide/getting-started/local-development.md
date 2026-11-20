# Local development

Start both the Vite development client and the Bun server from the repository root.

```bash
cp .env.example .env
# Set ADMIN_PASSWORD in .env to at least eight characters.
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:5173`. The API listens on `http://localhost:3000`. On first startup, Appercot creates the `admin` owner using `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

Development data is stored under `DATA_DIR`, which defaults to `.data`. Do not reuse this directory for unrelated test suites or production data.

## Verify the checkout

```bash
bun run check
bun run build
```

`check` validates documentation, formatting and lint rules, frontend layer boundaries, generated GraphQL operations, TypeScript, and tests. `build` creates the SPA and standalone server.

## Create a production-like standalone build

The server output contains three items that must stay together:

```text
apps/server/dist/
├── appercot          # appercot.exe on Windows
├── public/
└── drizzle/
```

Run it with an explicit data directory and owner credentials:

```bash
DATA_DIR=.data NODE_ENV=production \
ADMIN_USERNAME=admin ADMIN_PASSWORD='change-me' \
./apps/server/dist/appercot
```

The standalone server serves the SPA, GraphQL, files, and both WebSocket endpoints on `PORT`.

Next: [connect your first bot](first-bot.md).
