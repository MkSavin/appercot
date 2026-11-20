# Test configuration and fixtures

Start with [`examples/appercot.test.json`](../../../examples/appercot.test.json). It defines launch settings, one administrator, one user, one bot, one chat, and the test token.

```json
{
  "server": {
    "hostname": "127.0.0.1",
    "port": 0,
    "publicDir": "../apps/web/dist"
  },
  "admin": {
    "username": "admin",
    "password": "${ADMIN_PASSWORD}"
  },
  "users": [
    {
      "id": "user-alice",
      "username": "alice",
      "displayName": "Alice",
      "password": "${ALICE_PASSWORD}"
    }
  ],
  "bots": [
    {
      "id": "bot-echo",
      "username": "echo_bot",
      "name": "Echo",
      "owner": "alice",
      "token": "${ECHO_BOT_TOKEN}"
    }
  ],
  "chats": [
    {
      "id": "chat-alice-echo",
      "user": "alice",
      "bot": "echo_bot",
      "messages": [
        {
          "id": "message-ready",
          "sender": "bot",
          "content": { "text": "Ready" }
        }
      ]
    }
  ],
  "test": { "token": "${BOT_APPERCOT_TEST_TOKEN}" }
}
```

`port: 0` selects a free port. Paths in the configuration are resolved relative to the configuration file. `${NAME}` placeholders read process environment variables; keep secrets out of committed JSON.

Launch sections such as `registration`, `media`, `s3`, and `vapid` mirror server settings. The normal server also accepts `APPERCOT_CONFIG`, but only launch sections. `users`, `bots`, `chats`, and `test` are exclusive to the test CLI.

## Read baseline fixtures

```ts
const manifest = await appercot.fixtures()
const alice = manifest.users.find((user) => user.username === 'alice')
```

The manifest contains `admin`, `users`, `bots`, and `chats`. Baseline chats include their original messages. Credentials returned here are test-only secrets.

## Create runtime fixtures

```ts
const user = await appercot.createUser({
  username: 'bob',
  displayName: 'Bob',
  password: 'disposable-password',
})

const botFixture = await appercot.createBot({
  username: 'orders_bot',
  name: 'Orders',
  ownerId: user.id,
})

const chat = await appercot.createChat({
  userId: user.id,
  botId: botFixture.id,
})

await appercot.sendMessage({
  chatId: chat.id,
  sender: 'user',
  clientId: 'order-request-1',
  content: { text: '/start' },
})
```

Optional IDs make references deterministic. Repeat the same user `clientId` on a retry so ordinary idempotent delivery can return the existing message. Bot sends may supply a `clientId` when their content path supports it.

Next: [cleanup semantics](cleanup.md).
