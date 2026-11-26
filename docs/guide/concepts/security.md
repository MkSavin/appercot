# Security model

Appercot separates platform administration, bot ownership, chat membership, and command roles.

## Platform roles

| Role          | Capabilities                                                                  |
| ------------- | ----------------------------------------------------------------------------- |
| User          | Discover and join bots, use permitted commands, and manage personal settings  |
| Administrator | Create bots and manage bots they own                                          |
| Owner         | Manage all bots, assigned owners, registration invitations, and account roles |

Public bots appear in the catalog. Invitation-only bots require a link or direct grant. Invitation links can have roles, an expiry, and a use limit. Revoking a membership blocks direct operations until it is explicitly restored.

## Credentials and sessions

- Browser sessions use an HttpOnly cookie; server resolvers require a valid session.
- Bot tokens identify one bot and grant access only through its active memberships.
- Password changes close other sessions. Owner password resets close all sessions of the target account.
- Optional TOTP two-factor authentication uses a server-side key at `DATA_DIR/totp.key`.
- Resetting or transferring a bot invalidates credentials as described in [roles and access](../bots/roles-and-access.md).

Use TLS in production and keep credentials in environment variables or a secret manager. Restrict filesystem access to the database, media, backups, and `totp.key`.

## Browser-local message data

Drafts and unsent messages are stored in IndexedDB under the current account ID so they can survive reloads. These records contain message text and uploaded-file references. They are not encrypted by appercot, are not a backup, and remain on the browser profile until sent, deleted, or cleared by browser storage controls. Use appropriate device access controls and clear site data on shared devices. If IndexedDB is unavailable, the PWA warns that new drafts and unsent messages will not survive a reload.

## Content and files

Bot Markdown supports GFM without raw HTML in the PWA. File downloads and byte-range requests check access to the owning chat. URL imports validate redirects and network addresses; private hosts must be explicitly allowlisted with `MEDIA_TRUSTED_HOSTS`.

Do not treat user-provided URLs, filenames, or Markdown as trusted input in external systems. Playback depends on browser codec support, and the original uploaded bytes remain unchanged.

## Test isolation

`BOT_APPERCOT_TEST_TOKEN` protects destructive fixture operations. Its presence in an ordinary server environment does **not** enable the control API; only the dedicated test CLI does. Keep the endpoint on a test network and never point it at production data.

## Operational responsibility

Self-hosting transfers security responsibility to the operator. Keep the host and dependencies updated, limit registration and invitations where appropriate, monitor logs, and test restoration. Appercot's current documentation does not claim end-to-end encryption.

Next: [deployment configuration](../deployment/configuration.md).
