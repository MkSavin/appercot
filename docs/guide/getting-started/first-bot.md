# Your first bot

## 1. Create the bot

Start the [local server](local-development.md), sign in as the owner, and open **Settings → Bots**. The first-bot checklist is optional and can be hidden or restored per account.

Create a bot. The same dialog then shows `BOT_TOKEN`, `BOT_URL`, and a ready-to-copy echo-bot command. Copy the token or command and confirm that it is saved before closing. The token is shown only once; closing without confirmation asks whether to discard it. The bot settings contain the URL and launch instructions later, but a lost token can only be replaced with **Reset token**.

The token authenticates one bot. Anyone who obtains it can act as that bot within its chats, so pass it through an environment variable. It is kept only in the open dialog's memory, never in browser storage or the page URL.

## 2. Connect the SDK

In a separate bot project, install the published SDK with `npm install @appercot/chat`. For an Appercot prerelease, use `npm install @appercot/chat@beta`. Then create a TypeScript entry point.

```ts
import { createBot } from '@appercot/chat'

const token = process.env.BOT_TOKEN
if (!token) throw new Error('BOT_TOKEN is required')

const bot = createBot({
  url: process.env.BOT_URL ?? 'ws://localhost:3000/api/bot/ws',
  token,
})

const start = bot
  .command('start', 'Start', (context) => context.reply(`Hello, **${context.user.displayName}**`))
  .roles('all')

bot.on('chat_started', (context) => context.replyWithCommand(start, 'Use %s to begin.'))

await bot.start({ commands: [start] })
console.log('Bot connected')
```

Run the command copied from the dialog from the repository root. It uses the echo example and has this form:

```bash
BOT_TOKEN='<botId>:<token>' \
BOT_URL='ws://localhost:3000/api/bot/ws' \
bun examples/echo-bot/index.ts
```

The WebSocket URL is derived from `PUBLIC_URL`: HTTP becomes `ws://`, HTTPS becomes `wss://`, and the path is `/api/bot/ws`. Set the exact external origin, including a nonstandard port, when running behind a reverse proxy.

While the setup step is open, Appercot checks server presence and safe connection diagnostics. The checklist shows only online state, timestamps, stable error codes, and the number of pending events — never the token or event payload. Once the bot is online, open its chat and send `/start` to verify the real reply.

## 3. Understand startup and shutdown

`bot.start()` opens the connection, waits for the server handshake, and publishes configured commands or roles. The SDK reconnects with exponential backoff after a connection loss. Call `bot.stop()` during test teardown or application shutdown; stopping rejects pending readiness waits and permits a later restart.

## Complete examples

- [Echo bot](../../../examples/echo-bot/index.ts): commands, callbacks, shortcuts, and per-chat storage.
- [Wizard bot](../../../examples/wizard-bot/index.ts): a validated multi-step flow with input and navigation.

Next: [connections and lifecycle](../bots/connection.md).
