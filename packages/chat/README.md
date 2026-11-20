# Appercot bot SDK

Install `@appercot/chat` in the project that runs the bot. Create a bot in your Appercot instance and pass its token as `BOT_TOKEN`. Set `BOT_URL` to your instance's bot WebSocket endpoint, for example `wss://appercot.example/api/bot/ws`.

```js
import { createBot } from '@appercot/chat'

const bot = createBot({ url: process.env.BOT_URL, token: process.env.BOT_TOKEN })
const start = bot.command('start', 'Start', (context) => context.reply('Hello!'))

await bot.start({ commands: [start] })
```

Call `bot.stop()` when your process shuts down.
