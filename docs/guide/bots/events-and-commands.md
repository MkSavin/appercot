# Events, commands, and storage

## Events

Register listeners before `bot.start()`:

```ts
bot.on('chat_started', (context) => context.reply('Welcome'))
bot.on('message', (context) => context.reply(`You wrote: ${context.text}`))
bot.on('callback', async (context) => {
  await context.answer('Done')
})
```

Supported event types are `chat_started`, `message`, `command`, `callback`, `chat_updated`, `bot_blocked`, `bot_unblocked`, and `chat_cleared`.

Every context exposes `user`, `chat`, `roles`, `role`, `text`, and per-chat `storage`. Message and command events also expose `message`. Use `context.reply()` for text or structured message content.

## Commands

The two-argument description form returns a reusable `CommandDefinition`:

```ts
const start = bot
  .command('start', 'Start', (context) => context.reply('Ready'))
  .roles('all')
  .shortcut('Mod+Shift+H')

const help = bot
  .command('help', 'Help', (context) => context.replyWithCommand(start, 'Run %s to begin.'))
  .roles('all', 'guest')

await bot.start({ commands: [start, help] })
```

Alternatively, call `bot.commands([start, help])` before `bot.start()`. Command roles are checked both when the command is invoked and when a queued event is delivered.

`Mod` means Command on macOS and Control elsewhere. Letter, digit, and slash shortcuts use physical keyboard codes, so they continue to work in non-Latin layouts. Avoid browser-reserved `Ctrl+/` (`Cmd+/` on Apple platforms) and `Ctrl/Cmd+K`.

`replyWithCommand` inserts command names into one `%s` placeholder per definition. Without a template it produces a list with descriptions.

## Buttons and callbacks

```ts
bot.on('message', async (context) => {
  await context.reply({
    text: 'Choose an action',
    buttons: [[{ text: 'Confirm', callback: 'confirm', shortcut: 'Alt+C' }]],
  })
})

bot.on('callback', async (context) => {
  await context.answer('Confirmed')
})
```

Always answer callbacks when a toast or completion response is needed. Flow-owned callbacks are dispatched by the flow runtime rather than ordinary callback listeners.

## Per-chat storage

```ts
const count = (await context.storage.get<number>('messages')) ?? 0
await context.storage.set('messages', count + 1)
await context.storage.delete('temporary')
const values = await context.storage.all()
```

Storage accepts JSON values and is scoped to the current bot chat. It is not a cross-chat database or a substitute for an external transactional store. Handler serialization prevents overlapping storage updates within a chat.
