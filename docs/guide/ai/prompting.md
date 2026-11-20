# Effective prompts for AI assistants

A useful prompt names the task, runtime, deployment, and verification expected. Ask for current documentation instead of relying on a model's memory.

## Build a bot

```text
Using Appercot's current documentation, create a TypeScript bot with a start command,
a callback button, and per-chat storage. It will run with Bun against a local server.
Show the complete entry point and the environment variables. Use Context7.
```

## Add a flow

```text
Using library /OWNER/appercot, add a three-screen profile flow to my existing
@appercot/chat bot. Validate non-empty input, support back and cancel, and show how
to publish the command. Do not use server-internal APIs.
```

## Test behavior

```text
Using Appercot docs, write a Vitest integration test for a command and callback.
The test CLI is already running. Use AppercotTestClient, reset state before each test,
and stop the bot afterward. Explain which endpoint and token the runner needs.
```

## Deploy or recover

```text
Using current Appercot documentation, give me a Docker Compose deployment checklist
for a domain with automatic TLS and MinIO. Include backup and restore verification.
Do not expose test control APIs or invent high-availability support.
```

## Review an answer

Ask the assistant to cite the guide pages it used and distinguish current behavior from planned behavior. Reject answers that:

- Import unsupported Telegram SDKs or assume Telegram compatibility.
- Hard-code owner passwords, bot tokens, or control tokens.
- Enable fixture seeding or test endpoints in production.
- Claim end-to-end encryption, offline durability, or multi-node SQLite without evidence.
- Use CSS classes or translated text for browser selectors.

For a code change, require `bun run check` and the relevant end-to-end scenario rather than accepting a code snippet as proof.
