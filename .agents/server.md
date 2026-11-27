# Server

Bun routes GraphQL, files, static assets and two WebSocket endpoints. Domain operations own SQLite writes. The hub owns live connections and fans out persisted user updates or bot outbox events.

| Symptom | Read |
| --- | --- |
| An administrator sees a foreign bot, a join link fails or a command appears for the wrong member | [Platform and bot access](server/access.md) |
| A media import, preview or video seek fails | [Media delivery](server/media.md) |

```text
HTTP / WebSocket -> caller context -> domain -> SQLite
                                        |-----> Hub -> live clients and bots
```

- GraphQL session reads require a session cookie. Checked: INV:graphql/requires-session.
- Ending all other sessions preserves the caller's raw session ID, disconnects revoked sockets and leaves the current session active. Checked: INV:account-settings/manages-security.
- User sends with the same chat and client ID return the existing message. Checked: INV:messaging/idempotent-send.
- Read checkpoints cannot move backwards when tabs send read requests out of order. Checked: INV:messaging/keeps-read.
- The bot outbox replays unacknowledged events and removes them after ACK. Checked: INV:bot-ws/replays-outbox.
- File reads require access to the owning chat and support byte ranges. Checked: INV:files/protects-access.
- Per-chat message search uses external-content FTS5 with escaped quoted tokens, deleted filtering, ownership checks and stable cursors. Upgrade/backfill and edit/delete/cascade triggers stay synchronized. Checked: INV:message-search/synchronizes-index, INV:message-search/protects-results.
- Bot stop/resume is owner-scoped and persisted in `stoppedAt`; stopped bots cannot authenticate and their active socket is disconnected. Permanent bot deletion cascades chats and history, removes stale synchronization payloads, emits `chat.removed`, and detaches media for reliable physical cleanup. Checked: INV:admin/bot-lifecycle.

If compiled startup cannot find migrations, inspect [Bun compiled paths](workarounds/bun-compiled-path.md). Setup, environment and recovery commands are in the [deployment guide](../docs/guide/deployment/index.md).
