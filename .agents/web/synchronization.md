# Chat synchronization

`AppProviders` bootstraps the session and starts the client transport. The store combines GraphQL history with validated WebSocket updates. During catch-up, new frames schedule a further pass so they cannot move the checkpoint ahead of the fetched updates.

- Each account has its own persisted checkpoint. Checked: INV:chat-store/isolates-checkpoints.
- Responses from an ended session cannot restore that session during reset. Checked: INV:synchronization/ignores-stale.
- Reset refreshes the session and open history before replay. Checked: INV:synchronization/reloads-history.
- A history load or pagination preserves pending sends. Checked: INV:chat-store/preserves-pending.
- A failed send retries with the original client ID. Checked: INV:send-message/reuses-id.
- A late send response preserves processed status and cannot restore a cleared optimistic message. Checked: INV:chat-store/keeps-processed, INV:chat-store/ignores-cleared.
- A fresh session starts from a snapshot checkpoint. A reconnect reads bounded update batches and chat history uses cursor pages. Checked: INV:large-history/bounds-replay.

The browser retains up to 12 inactive chats with at most 150 cached messages each. Opening a cached chat reconciles its history against the latest page. The active message list renders a measured window and anchors the scroll position when earlier pages are prepended.

The update sequence is global across accounts. A gap can represent another account's update, so the client uses GraphQL catch-up to establish which updates it missed. Not checked automatically: the current fallback has no multi-account load test.
