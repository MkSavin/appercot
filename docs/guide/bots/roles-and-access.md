# Roles and access

Platform roles control administration. Bot roles control what a member can do inside a particular bot chat; they are separate systems.

## Publish bot roles

```ts
await bot.start({
  roles: [
    { code: 'user', name: 'Member' },
    { code: 'moderator', name: 'Moderator' },
  ],
  defaultRoles: ['user'],
  listed: true,
  access: 'public',
  commands: [start, moderate],
})
```

A regular signed-in member has at most one custom role. When the bot registers `user`, new signed-in members receive it unless an invitation or configured default supplies another role.

`owner` and `guest` are derived by the platform and cannot be assigned by the bot. Public bots can allow guest sessions through `/guest/<username>`. Guests cannot send free text, upload files, use callbacks, or read account chats.

## Restrict commands

```ts
const moderate = bot.command('moderate', 'Moderation tools', handler).roles('owner', 'moderator')
```

Unrestricted commands and `all` apply to signed-in users. Add `guest` explicitly when a guest may run the command. Role grants are checked again when queued command events are delivered.

## Change the current member's role

```ts
await context.setRole('moderator')
await context.setRole(null)
```

Use `context.hasRole('moderator')` for additional handler-level decisions. The current role list is available as `context.roles`; the first role is exposed as `context.role`.

## Membership lifecycle

Public bots are discoverable. `by_link` bots require an invitation or direct grant. Links may define roles, expiry, and use limits. Editing a link affects future acceptances; revoking it does not revoke existing memberships.

A revoked member cannot use direct message, file, bot API, or push paths until restored. Transferring a bot invalidates its credential and active join links. Resetting its token closes the active bot socket, so distribute a replacement token through your secret-management process.

For account roles and credential storage, see the [security model](../concepts/security.md).
