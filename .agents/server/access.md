# Platform and bot access

```text
Platform session -> account role -> control-plane abilities
                 -> bot membership -> chat resources and command roles
Bot token        -> one bot       -> its active chat memberships
```

| Platform role | Management |
| --- | --- |
| User | Discover and join bots, use permitted commands, manage personal settings |
| Administrator | Create bots and manage bots they own |
| Owner | Manage all bots and their assigned owners, registration invites and account roles |

The platform owner is created by bootstrap credentials or the first bootstrap registration. The upgrade keeps the oldest legacy administrator as owner and migrates other legacy administrators to scoped administrators. The owner role is fixed in the UI and API. Checked: INV:admin/migrates-owner, INV:admin/scopes-management.

New bots belong to their creator. Public bots appear in the catalog. Invitation-only bots require a link or a direct grant by username for a new membership. Each link has its own roles, expiry, use limit and counter. A user consumes one use per link. Editing affects future acceptances, and revoking a link leaves other links and existing memberships active. Revoked memberships require explicit restoration. Checked: INV:admin/scopes-management.

A platform invitation creates a user or administrator account. The owner can edit its settings and revoke it. Registration and incrementing the use counter share a transaction. `ALLOW_REGISTRATION=false` blocks sign-ups. `ALLOW_USER_INVITES=false` blocks creating and editing registration invites. Existing links and revocation still work. Checked: INV:admin/registration-invites, INV:guest/configures-registration.

Users manage their name, username, biography, password, 2FA and sessions from their profile. The owner can edit account details or reset another user's password. A password change closes other sessions and an owner reset closes all sessions of the target. Session revocation closes the corresponding WebSocket and prevents further HTTP access. Only the owner account is protected from self-deletion. Checked: INV:account-settings/manages-security.

TOTP uses six digits, a 30-second step and one step of clock tolerance. A verified step cannot be replayed. The server uses `DATA_DIR/totp.key` to decrypt TOTP secrets and stores a hash of the recovery code. Login with the recovery code disables TOTP for re-enrollment. [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238.html). Checked: INV:account-settings/manages-security.

Bots register role codes and display names via SDK. A regular member has at most one role. When a bot registers `user`, new signed-in members receive it unless an invitation or the bot's configured default supplies another role. Settings show role definitions and allow a manager to assign individual members. The platform derives `owner` from the current bot owner and `guest` from guest sessions. These roles cannot be assigned by the bot. Bot commands use current role grants at invocation and when queued command events are delivered. Checked: INV:admin/scopes-management, INV:messaging/rechecks-command, INV:guest/isolates-commands.

Public bots can opt into `/guest/<username>`. A separate HttpOnly cookie identifies a guest session for one hour. Guest commands require an explicit `guest` in the allowlist. `all` and unrestricted commands apply to signed-in users. Guests cannot send free text, upload files, use callbacks or read account chats. Checked: INV:guest/isolates-commands.

Revoked memberships retain server history for restoration. While revoked they are absent from session lists and unread chat updates, and direct message, file, bot API and push operations check the membership. Checked: INV:admin/scopes-management.

Not checked automatically: the membership scenario covers messages, sync and bot sends. File and push revocation use their own membership filters.

Transferring a bot invalidates its credential and active join links. Resetting its token closes the current bot socket. Not checked automatically: the active-socket transition needs a dedicated test.
