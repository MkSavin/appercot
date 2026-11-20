# Connection and lifecycle

## Create and start

```ts
import { createBot } from '@appercot/chat'

const bot = createBot({
  url: process.env.BOT_URL ?? 'ws://localhost:3000/api/bot/ws',
  token: process.env.BOT_TOKEN!,
  ackOnError: false,
})

await bot.start()
```

Use `ws://` for local HTTP and `wss://` for HTTPS deployments. The default local endpoint is `ws://localhost:3000/api/bot/ws`.

`start()` waits for the protocol handshake and any configured command or role publication. Configuration is registered before queued events are delivered to handlers.

## Reconnects

While started, the connection retries after socket closure with exponential backoff and jitter. RPC calls pending on a closed socket reject; a caller must decide whether retrying its operation is safe. Do not assume that reconnecting cancels a handler already running in your process.

Call `bot.stop()` on shutdown. A stopped instance can be started again.

## Event acknowledgement

The server persists bot events before delivery and removes them only after acknowledgement.

- With `ackOnError: true` (the default), a failing listener is still acknowledged.
- With `ackOnError: false`, a listener failure leaves the event unacknowledged for redelivery.

Choose `false` when event loss is worse than repeated handling. Make external side effects idempotent because retries can occur. A redelivered event should not create a second payment, ticket, or other non-idempotent resource.

Protocol errors from RPC calls surface as `BotApiError` with a machine-readable `code`. Network closure and RPC timeout errors are ordinary errors and should be logged with enough context to diagnose the operation, but never with the bot token.

## Ordering

The SDK serializes event handling and storage updates within one chat. Different chats have independent queues. Do not introduce a global lock that makes unrelated chats wait for a slow integration.

Next: [events, commands, and storage](events-and-commands.md).
