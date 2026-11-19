# Web

The React PWA owns rendering, navigation, pending sends and the browser session view. Feature-Sliced dependencies flow down through public slice entry points.

Desktop uses a navigation rail, a context panel and a work area. Mobile switches between list and detail screens. Settings groups are profile, appearance, notifications and role-scoped management. Chat pins are local to the browser account, and drafts survive navigation within the current session. Theme colors come from [Zen Inspired Theme](https://tweakcn.com/themes/cmlm03etv000204lh15608kec).

```text
app -> pages -> widgets -> features -> entities -> shared
                                           GraphQL + WebSocket -> server
```

| Question | Read |
| --- | --- |
| Why is history empty after reconnect or a send duplicated? | [Synchronization](web/synchronization.md) |
| Why does Enter send while an IME is active? | [IME Enter](workarounds/ime-enter.md) |

- Bot Markdown displays GFM without raw HTML. Checked: INV:ui/sanitizes-markdown.
- A push click accepts only same-origin chat routes. Checked: INV:pwa/restricts-deeplinks.
- Bot join links survive platform sign-in without allowing external return URLs. Checked: INV:admin-ui/preserves-invitation.

Bot settings open from the managed bot list. Creation and invitations are dialogs, and chat pinning uses a context menu. Bot responses use the full message column and the composer is a floating surface with a separate tools row. Not checked automatically: these layout details require a browser.
- The chat header opens the bot profile and media gallery. A welcome message appears in an empty chat. Deleting a chat removes its history and hides it while retaining membership and blocking. Checked: INV:bot-profile/chat-deletion.
- Ctrl/Cmd+J opens the palette with available commands and the latest bot keyboard. Commands keep their generated or explicit shortcuts outside the palette. Only explicit button shortcuts persist outside it, for the latest bot message. Conflicts receive a generated shortcut inside the palette. Checked: INV:command-palette/scopes-shortcuts.
- Catalog, history and administration distinguish failed loads from empty results and expose a retry. Not checked automatically: requires an interactive browser with failing requests.
- The message viewport follows the bottom while the reader is near it. Earlier messages stay in view when new ones arrive. Not checked automatically: requires browser layout and scrolling.
- The 2FA challenge replaces the password form with a six-slot OTP form. Leaving the challenge clears both credentials and code. Not checked automatically: requires an interactive browser session with 2FA enabled.

[App entry](../apps/web/src/app/index.tsx)
