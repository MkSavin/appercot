# Development

This section is for people changing Appercot rather than only running a bot on it.

- [Project structure](project-structure.md): where protocols, server behavior, UI, SDK, and tests live.
- [Verification workflow](workflow.md): which checks to run and when.
- [Documentation maintenance](documentation.md): how to choose a documentation layer, write pages, and keep Context7 useful.

Always read the repository root `AGENTS.md` before editing code. Its **Never break** rules are binding project invariants; follow the linked `.agents` page for the affected subsystem.

Public usage belongs in this guide. Source-linked invariants and workarounds belong in `.agents`. Design history belongs under `docs/superpowers` and should not be presented as current API documentation.
