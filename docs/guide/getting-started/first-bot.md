# Your first bot

## 1. Create the bot

Start the [local server](local-development.md), sign in as the owner, and open **Settings → Bots**. Create a bot and copy its token in the form `<botId>:<token>`.

The token authenticates one bot. Anyone who obtains it can act as that bot within its chats, so pass it through an environment variable.

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

Run it from this repository with the echo example:

```bash
BOT_TOKEN='<botId>:<token>' \
BOT_URL='ws://localhost:3000/api/bot/ws' \
bun examples/echo-bot/index.ts
```

For a remote TLS deployment, use `wss://your-domain.example/api/bot/ws`.

## 3. Understand startup and shutdown

`bot.start()` opens the connection, waits for the server handshake, and publishes configured commands or roles. The SDK reconnects with exponential backoff after a connection loss. Call `bot.stop()` during test teardown or application shutdown; stopping rejects pending readiness waits and permits a later restart.

## Complete examples

- [Echo bot](../../../examples/echo-bot/index.ts): commands, callbacks, shortcuts, and per-chat storage.
- [Wizard bot](../../../examples/wizard-bot/index.ts): a validated multi-step flow with input and navigation.

Next: [connections and lifecycle](../bots/connection.md).
