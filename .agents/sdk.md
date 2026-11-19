# Bot SDK

```text
Bot -> BotConnection -> hello / RPC / events / ACK
 |---> Context + storage
 |---> FlowBuilder -> validated flow runtime
```

- Event handling and storage updates are serialized within a chat. Different chats have separate queues. Checked: INV:bot/orders-events.
- Use `bot.command(code, description, handler).roles(...codes).shortcut(chord)`, then publish the definitions with `bot.commands([...])` or `bot.start({ commands: [...] })`. Supply custom role definitions as `roles: [{ code, name }]` to `bot.start`. Configuring SDK connections register before receiving queued events. Server command scope derives from membership. Handler role options gate SDK dispatch as well. Checked: INV:admin/scopes-management, INV:messaging/rechecks-command, INV:guest/isolates-commands.
- Use `context.setRole(code)` to replace a member's custom role and `context.setRole(null)` to clear it. `context.replyWithCommand` inserts commands into `%s` placeholders or produces a list with descriptions. The browser recognizes available commands in ordinary reply text too. Checked: INV:command/formats-reply.
- Command and message button definitions accept chords such as `Mod+Shift+H` and `Alt+C`. `Mod` maps to Cmd on macOS and Ctrl elsewhere. The browser reserves Ctrl/Cmd+J and Ctrl/Cmd+K. Not checked automatically: OS-level interception varies by browser.
- Stopping rejects readiness waits and permits a fresh start. Checked: INV:bot/restarts-connection.
- The flow runtime rejects buttons from obsolete screens. Checked: INV:flow/rejects-stale.
- A wizard removes a text reply it consumes. Its current screen stays in the existing bot message. The removed text is absent from chat history and synchronization. A late send confirmation does not restore it. Checked: INV:flow/consumes-text, INV:bot-profile/chat-deletion, INV:chat-store/hides-consumed.
- RPC failures surface as `BotApiError` for protocol errors. With `ackOnError: false`, a handler failure leaves the event unacknowledged for redelivery. Not checked automatically: listener-failure and malformed-response paths have no isolated transport fixture.

Runnable examples use [echo](../examples/echo-bot/index.ts) and [wizard](../examples/wizard-bot/index.ts).
