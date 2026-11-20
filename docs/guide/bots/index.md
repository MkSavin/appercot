# Bot development

Use `@appercot/chat` for supported bot integrations. It hides frame validation, reconnects, acknowledgements, RPC, uploads, command dispatch, and flow runtime details.

| Topic                                                   | When to read it                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Connection and lifecycle](connection.md)               | Starting, reconnecting, acknowledging events, and shutting down                           |
| [Events, commands, and storage](events-and-commands.md) | Replying to users, publishing commands, handling buttons, and keeping per-chat JSON state |
| [Multi-step flows](flows.md)                            | Collecting input and navigating validated screens                                         |
| [Messages and media](messages-and-media.md)             | Formatting, editing, deleting, uploading, and sending files                               |
| [Roles and access](roles-and-access.md)                 | Restricting commands and managing members                                                 |

Start with the [first bot guide](../getting-started/first-bot.md) if the SDK is not connected yet. Use the [test environment](../testing/index.md) for repeatable integration scenarios.
