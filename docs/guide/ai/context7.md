# Context7 setup

Appercot includes a root [`context7.json`](../../../context7.json). It names the project, limits indexing to `docs/guide`, and supplies short rules for coding assistants. Root Markdown files are also eligible under Context7's normal parsing rules.

The configuration does **not** publish a repository or create a Context7 library by itself. A maintainer must submit the public repository through [Context7 Add Library](https://context7.com/add-library). Private sources require Context7's private-source workflow.

## Configure an AI client

The Context7 CLI requires Node.js 22.13 or newer:

```bash
npx ctx7 setup
```

Choose CLI + Skills or MCP mode in the installer. An API key from the Context7 dashboard is recommended for higher rate limits. Keep that key in the client configuration or environment, not in this repository.

For manual MCP configuration, use `https://mcp.context7.com/mcp`. Follow the [official client instructions](https://context7.com/docs/resources/all-clients) for the tool you use.

## Query Appercot

After submission and parsing, Context7 assigns an ID in the form `/OWNER/appercot`. Replace `OWNER` with the actual repository owner and use the exact ID shown by Context7:

```text
Show me how to create and test an Appercot bot with commands and callbacks.
Use library /OWNER/appercot.
```

Without an exact ID, ask the assistant to resolve `Appercot` with Context7 and select the repository you submitted. Do not guess an ID or assume the project is indexed before the parse succeeds.

## When to use it

Use Context7 for SDK setup, bot commands and flows, media delivery, test lifecycle, deployment, configuration, backup, and recovery. Include the target context in the question, such as local Bun development, Docker production, Vitest, Jest, or Playwright.

For source changes and non-negotiable implementation invariants, read `AGENTS.md` and `.agents` directly. Context7 indexes public usage documentation; it is not a replacement for repository-specific engineering instructions.

## Publish documentation changes

1. Update the relevant small page under `docs/guide` and its folder `index.md` when navigation changes.
2. Run `bun run docs:check` and the full `bun run check` before publishing.
3. Push to the repository's default branch.
4. Refresh the library in Context7 when immediate availability matters; otherwise normal refresh scheduling applies.
5. Ask a real Context7 client a narrow question and verify that the answer uses the new page.

To claim and manage the library, follow the [ownership guide](https://context7.com/docs/howto/claiming-libraries). Add the generated `url` and `public_key` to `context7.json` only when Context7 supplies them. A public claiming key is not a substitute for the private API key used by clients.
