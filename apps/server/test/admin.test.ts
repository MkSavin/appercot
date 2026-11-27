import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { authenticateBotToken } from '../src/auth/bot-token'
import { hashPassword } from '../src/auth/password'
import { bots, chats, messages, users, userUpdates } from '../src/db/schema'
import { connectBot, createServerFixture, graphqlRequest, waitFor } from './helpers'

const login = async (baseUrl: string, username: string, password: string) => {
  const result = await graphqlRequest(
    baseUrl,
    'mutation Login($username: String!, $password: String!) { login(username: $username, password: $password) { user { id isAdmin } } }',
    { username, password },
  )
  const cookie = result.response.headers.get('set-cookie')
  if (!cookie) throw new Error('Session cookie is missing')
  return cookie
}

describe('administration', () => {
  // @anchor INV:admin/migrates-owner
  test('keeps the oldest legacy administrator as the platform owner', async () => {
    const db = new Database(':memory:')
    try {
      const migration = (name: string) =>
        Bun.file(new URL(`../drizzle/${name}.sql`, import.meta.url)).text()
      db.exec(await migration('0000_lonely_moira_mactaggert'))
      const insert = db.query(
        'INSERT INTO users (id, username, display_name, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      insert.run('member', 'member', 'Member', 'hash', 0, 1)
      insert.run('creator', 'creator', 'Creator', 'hash', 1, 2)
      insert.run('manager', 'manager', 'Manager', 'hash', 1, 3)
      db.exec(await migration('0001_tense_tomas'))
      expect(db.query('SELECT id, role FROM users ORDER BY created_at').all()).toEqual([
        { id: 'member', role: 'user' },
        { id: 'creator', role: 'owner' },
        { id: 'manager', role: 'admin' },
      ])
    } finally {
      db.close()
    }
  })

  // @anchor INV:admin/scopes-management
  test('scopes bot management, invitations and membership to the appropriate account', async () => {
    const fixture = createServerFixture()
    try {
      const ownerCookie = await login(fixture.baseUrl, 'admin', 'password123')
      const passwordHash = await hashPassword('password123')
      const managerId = Bun.randomUUIDv7()
      const memberId = Bun.randomUUIDv7()
      fixture.db
        .insert(users)
        .values([
          {
            id: managerId,
            username: 'manager',
            displayName: 'Manager',
            passwordHash,
            createdAt: Date.now(),
          },
          {
            id: memberId,
            username: 'visitor',
            displayName: 'Visitor',
            passwordHash,
            createdAt: Date.now(),
          },
        ])
        .run()
      const managerCookie = await login(fixture.baseUrl, 'manager', 'password123')
      const memberCookie = await login(fixture.baseUrl, 'visitor', 'password123')
      const call = async (cookie: string, query: string, variables: Record<string, unknown> = {}) =>
        (await graphqlRequest(fixture.baseUrl, query, variables, cookie)).body
      const create =
        'mutation($name: String!) { createBot(username: $name, name: "Example", description: "") { bot { id } token } }'
      expect(
        (await call(managerCookie, create, { name: 'managedbot' })).errors?.[0]?.extensions?.code,
      ).toBe('FORBIDDEN')
      const promote = 'mutation($id: ID!) { setUserRole(userId: $id, role: admin) { role } }'
      expect((await call(ownerCookie, promote, { id: managerId })).data.setUserRole).toEqual({
        role: 'admin',
      })
      expect(
        (await call(managerCookie, promote, { id: memberId })).errors?.[0]?.extensions?.code,
      ).toBe('FORBIDDEN')
      expect(
        (await call(managerCookie, 'query { adminInvites { code } }')).errors?.[0]?.extensions
          ?.code,
      ).toBe('FORBIDDEN')
      const managed = (await call(managerCookie, create, { name: 'managedbot' })).data
        .createBot as {
        bot: { id: string }
        token: string
      }
      const foreign = (await call(ownerCookie, create, { name: 'foreignbot' })).data.createBot as {
        bot: { id: string }
      }
      const botId = managed.bot.id
      expect((await call(managerCookie, 'query { adminBots { id } }')).data.adminBots).toEqual([
        { id: botId },
      ])
      const diagnostics =
        'query($bot: ID!) { adminBotDiagnostics(botId: $bot) { online connectedAt disconnectedAt lastActivityAt lastErrorCode lastErrorAt pendingEvents } }'
      expect(
        (await call(managerCookie, diagnostics, { bot: botId })).data.adminBotDiagnostics,
      ).toEqual({
        online: false,
        connectedAt: null,
        disconnectedAt: null,
        lastActivityAt: null,
        lastErrorCode: null,
        lastErrorAt: null,
        pendingEvents: 0,
      })
      expect(
        (await call(managerCookie, diagnostics, { bot: foreign.bot.id })).errors?.[0]?.extensions
          ?.code,
      ).toBe('FORBIDDEN')
      expect(
        (await call(memberCookie, diagnostics, { bot: botId })).errors?.[0]?.extensions?.code,
      ).toBe('FORBIDDEN')
      const access = 'mutation($bot: ID!) { setBotAccess(botId: $bot, access: by_link) { access } }'
      expect(
        (await call(managerCookie, access, { bot: foreign.bot.id })).errors?.[0]?.extensions?.code,
      ).toBe('FORBIDDEN')
      expect(
        (
          await call(
            managerCookie,
            'mutation($bot: ID!) { setBotStopped(botId: $bot, stopped: true) { id } }',
            { bot: foreign.bot.id },
          )
        ).errors?.[0]?.extensions?.code,
      ).toBe('FORBIDDEN')
      expect(
        (
          await call(managerCookie, 'mutation($bot: ID!) { deleteBot(botId: $bot) }', {
            bot: foreign.bot.id,
          })
        ).errors?.[0]?.extensions?.code,
      ).toBe('FORBIDDEN')
      expect((await call(managerCookie, access, { bot: botId })).data.setBotAccess).toEqual({
        access: 'by_link',
      })
      expect(
        (await call(memberCookie, 'query { browseBots { username } }')).data.browseBots,
      ).toEqual([{ username: 'foreignbot' }])

      const issue = async () => {
        const result = await call(
          managerCookie,
          'mutation($bot: ID!) { issueBotInvite(botId: $bot) { id url } }',
          { bot: botId },
        )
        const { id, url } = result.data.issueBotInvite as { id: string; url: string }
        return { id, token: new URL(url).searchParams.get('invite') }
      }
      const oldInvite = await issue()
      const invite = await issue()
      const revokeLink = 'mutation($bot: ID!, $id: ID!) { revokeBotInvite(botId: $bot, id: $id) }'
      expect(
        (
          await call(
            managerCookie,
            'query($bot: ID!) { botInvitations(botId: $bot) { id revokedAt } }',
            { bot: botId },
          )
        ).data.botInvitations,
      ).toEqual(
        expect.arrayContaining([
          { id: invite.id, revokedAt: null },
          { id: oldInvite.id, revokedAt: null },
        ]),
      )
      const add =
        'mutation($invite: String) { addBot(username: "managedbot", invite: $invite) { id roles } }'
      expect((await call(memberCookie, add)).errors?.[0]?.extensions?.code).toBe('NOT_FOUND')
      expect(
        (await call(managerCookie, revokeLink, { bot: botId, id: oldInvite.id })).data
          .revokeBotInvite,
      ).toBe(true)
      expect(
        (await call(memberCookie, add, { invite: oldInvite.token })).errors?.[0]?.extensions?.code,
      ).toBe('NOT_FOUND')
      const membership = (await call(memberCookie, add, { invite: invite.token })).data.addBot as {
        id: string
        roles: string[]
      }
      expect(membership.roles).toEqual([])
      expect(
        (
          await call(managerCookie, revokeLink, {
            bot: botId,
            id: invite.id,
          })
        ).data.revokeBotInvite,
      ).toBe(true)

      const bot = await connectBot(fixture.baseUrl, managed.token)
      try {
        expect((await bot.next()).t).toBe('hello')
        expect(
          (
            await bot.call('setup', 'setRoles', {
              roles: [
                { code: 'operator', name: 'Оператор' },
                { code: 'editor', name: 'Редактор' },
              ],
              commands: [{ name: 'operate', description: 'Operate', roles: ['operator'] }],
            })
          ).ok,
        ).toBe(true)
        const grant =
          'mutation($bot: ID!, $chat: ID!, $roles: [String!]!) { setBotMemberRoles(botId: $bot, chatId: $chat, roles: $roles) }'
        const variables = { bot: botId, chat: membership.id, roles: ['operator'] }
        expect(
          (await call(managerCookie, grant, { ...variables, roles: ['guest'] })).errors?.[0]
            ?.extensions?.code,
        ).toBe('BAD_REQUEST')
        expect(
          (await call(managerCookie, grant, { ...variables, roles: ['operator', 'editor'] }))
            .errors?.[0]?.extensions?.code,
        ).toBe('BAD_REQUEST')
        expect((await call(managerCookie, grant, variables)).data.setBotMemberRoles).toBe(true)
        expect(
          (await call(memberCookie, 'query { session { chats { commands { name } } } }')).data
            .session,
        ).toEqual({ chats: [{ commands: [{ name: 'operate' }] }] })
        expect(
          (
            await bot.call('send', 'sendMessage', {
              chatId: membership.id,
              content: { text: 'Private history' },
            })
          ).ok,
        ).toBe(true)

        const revoke =
          'mutation($bot: ID!, $chat: ID!, $revoked: Boolean!) { setBotMemberRevoked(botId: $bot, chatId: $chat, revoked: $revoked) }'
        expect(
          (await call(managerCookie, revoke, { ...variables, revoked: true })).data
            .setBotMemberRevoked,
        ).toBe(true)
        expect(
          (await call(memberCookie, add, { invite: invite.token })).errors?.[0]?.extensions?.code,
        ).toBe('FORBIDDEN')
        expect(
          (
            await call(memberCookie, 'query($chat: ID!) { messages(chatId: $chat) { id } }', {
              chat: membership.id,
            })
          ).errors?.[0]?.extensions?.code,
        ).toBe('FORBIDDEN')
        expect(
          JSON.stringify(
            (await call(memberCookie, 'query { sync(since: 0) { updates { payload } } }')).data,
          ),
        ).not.toContain('Private history')
        expect(
          (
            await bot.call('revoked', 'sendMessage', {
              chatId: membership.id,
              content: { text: 'Blocked' },
            })
          ).ok,
        ).toBe(false)
        expect(
          (await call(managerCookie, revoke, { ...variables, revoked: false })).data
            .setBotMemberRevoked,
        ).toBe(true)
        expect(
          (await call(memberCookie, 'query { session { chats { id } } }')).data.session,
        ).toEqual({ chats: [{ id: membership.id }] })

        const roleLink =
          'mutation($bot: ID!, $roles: [String!]) { issueBotInvite(botId: $bot, roles: $roles, maxUses: 1) { id url } }'
        expect(
          (await call(managerCookie, roleLink, { bot: botId, roles: ['authenticated'] }))
            .errors?.[0]?.extensions?.code,
        ).toBe('BAD_REQUEST')
        const issued = (await call(managerCookie, roleLink, { bot: botId, roles: ['operator'] }))
          .data.issueBotInvite as { id: string; url: string }
        const roleToken = new URL(issued.url).searchParams.get('invite')
        expect((await call(ownerCookie, add, { invite: roleToken })).data.addBot).toMatchObject({
          roles: ['operator'],
        })
        expect((await call(ownerCookie, add, { invite: roleToken })).errors).toBeUndefined()
        expect(
          (await call(managerCookie, add, { invite: roleToken })).errors?.[0]?.extensions?.code,
        ).toBe('FORBIDDEN')
        const changedLink = await call(
          managerCookie,
          'mutation($bot: ID!, $id: ID!) { editBotInvite(botId: $bot, id: $id, roles: [], maxUses: 2, expiresInDays: null) { uses maxUses roles expiresAt } }',
          { bot: botId, id: issued.id },
        )
        expect(changedLink.data.editBotInvite).toEqual({
          uses: 1,
          maxUses: 2,
          roles: [],
          expiresAt: null,
        })
        expect((await call(managerCookie, add, { invite: roleToken })).data.addBot).toMatchObject({
          roles: ['owner'],
        })

        const direct =
          'mutation($bot: ID!, $username: String!, $roles: [String!]!) { inviteBotMember(botId: $bot, username: $username, roles: $roles) }'
        expect(
          (await call(managerCookie, direct, { bot: foreign.bot.id, username: 'admin', roles: [] }))
            .errors?.[0]?.extensions?.code,
        ).toBe('FORBIDDEN')
        expect(
          (
            await call(managerCookie, direct, {
              bot: botId,
              username: 'admin',
              roles: ['operator'],
            })
          ).data.inviteBotMember,
        ).toBe(true)
        expect(
          (await call(ownerCookie, 'query { session { chats { roles } } }')).data.session,
        ).toEqual({ chats: [{ roles: ['operator'] }] })
        expect(
          (
            await call(
              managerCookie,
              'query($bot: ID!) { adminBot(botId: $bot) { memberCount } }',
              { bot: botId },
            )
          ).data.adminBot,
        ).toEqual({ memberCount: 3 })
      } finally {
        bot.socket.close()
      }
    } finally {
      fixture.stop()
    }
  })

  // @anchor INV:admin/bot-lifecycle
  test('stops, resumes and permanently deletes a managed bot', async () => {
    const fixture = createServerFixture()
    let bot: Awaited<ReturnType<typeof connectBot>> | undefined
    try {
      const cookie = await login(fixture.baseUrl, 'admin', 'password123')
      const createdResult = await graphqlRequest(
        fixture.baseUrl,
        'mutation { createBot(username: "lifecyclebot", name: "Lifecycle", description: "") { token bot { id stopped online } } }',
        {},
        cookie,
      )
      const created = createdResult.body.data.createBot as {
        token: string
        bot: { id: string; stopped: boolean; online: boolean }
      }
      expect(created.bot).toMatchObject({ stopped: false, online: false })
      bot = await connectBot(fixture.baseUrl, created.token)
      expect((await bot.next()).t).toBe('hello')

      const stopped = await graphqlRequest(
        fixture.baseUrl,
        'mutation($bot: ID!) { setBotStopped(botId: $bot, stopped: true) { stopped online } }',
        { bot: created.bot.id },
        cookie,
      )
      expect(stopped.body.data.setBotStopped).toEqual({ stopped: true, online: false })
      await waitFor(() => !fixture.hub.isBotOnline(created.bot.id))
      expect(authenticateBotToken(fixture.db, created.token)).toBeNull()

      const resumed = await graphqlRequest(
        fixture.baseUrl,
        'mutation($bot: ID!) { setBotStopped(botId: $bot, stopped: false) { stopped online } }',
        { bot: created.bot.id },
        cookie,
      )
      expect(resumed.body.data.setBotStopped).toEqual({ stopped: false, online: false })
      bot = await connectBot(fixture.baseUrl, created.token)
      expect((await bot.next()).t).toBe('hello')

      const added = await graphqlRequest(
        fixture.baseUrl,
        'mutation { addBot(username: "lifecyclebot") { id } }',
        {},
        cookie,
      )
      const chatId = (added.body.data.addBot as { id: string }).id
      expect(
        (
          await bot.call('send', 'sendMessage', {
            chatId,
            content: { text: 'Delete this history' },
          })
        ).ok,
      ).toBe(true)
      expect(
        fixture.db.select().from(messages).where(eq(messages.chatId, chatId)).all(),
      ).toHaveLength(1)

      const deleted = await graphqlRequest(
        fixture.baseUrl,
        'mutation($bot: ID!) { deleteBot(botId: $bot) }',
        { bot: created.bot.id },
        cookie,
      )
      expect(deleted.body.data.deleteBot).toBe(true)
      expect(
        fixture.db.select().from(bots).where(eq(bots.id, created.bot.id)).get(),
      ).toBeUndefined()
      expect(fixture.db.select().from(chats).where(eq(chats.id, chatId)).get()).toBeUndefined()
      expect(fixture.db.select().from(messages).where(eq(messages.chatId, chatId)).all()).toEqual(
        [],
      )
      const updates = fixture.db.select().from(userUpdates).all()
      expect(updates.every((update) => update.payload.type === 'chat.removed')).toBe(true)
      await waitFor(() => !fixture.hub.isBotOnline(created.bot.id))
    } finally {
      bot?.socket.close()
      fixture.stop()
    }
  })

  test('manages users, invites, bot tokens, ownership and catalog visibility', async () => {
    const fixture = createServerFixture()
    try {
      const adminCookie = await login(fixture.baseUrl, 'admin', 'password123')
      const inviteResult = await graphqlRequest(
        fixture.baseUrl,
        'mutation { createInvite(maxUses: 2, expiresInDays: 7) { code uses maxUses url } }',
        {},
        adminCookie,
      )
      expect(inviteResult.body.errors).toBeUndefined()
      const invite = inviteResult.body.data.createInvite as {
        code: string
        uses: number
        maxUses: number
        url: string
      }
      expect(invite).toMatchObject({ uses: 0, maxUses: 2 })
      expect(invite.url).toBe(`http://localhost/register?invite=${invite.code}`)

      const registration = await graphqlRequest(
        fixture.baseUrl,
        'mutation Register($invite: String!) { register(username: "member", password: "password123", displayName: "Member", invite: $invite) { user { id isAdmin } } }',
        { invite: invite.code },
      )
      expect(registration.body.errors).toBeUndefined()
      const memberCookie = registration.response.headers.get('set-cookie')
      if (!memberCookie) throw new Error('Member session cookie is missing')

      const forbidden = await graphqlRequest(
        fixture.baseUrl,
        'query { adminUsers { id } }',
        {},
        memberCookie,
      )
      expect(forbidden.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')

      const usersResult = await graphqlRequest(
        fixture.baseUrl,
        'query { adminUsers(query: "memb") { username displayName isAdmin } }',
        {},
        adminCookie,
      )
      expect(usersResult.body.data.adminUsers).toEqual([
        { username: 'member', displayName: 'Member', isAdmin: false },
      ])
      const invitesResult = await graphqlRequest(
        fixture.baseUrl,
        'query { adminInvites { code uses maxUses url } }',
        {},
        adminCookie,
      )
      expect(invitesResult.body.data.adminInvites).toContainEqual({ ...invite, uses: 1 })

      const botResult = await graphqlRequest(
        fixture.baseUrl,
        'mutation { createBot(username: "catalogbot", name: "Catalog", description: "Test bot") { token bot { id username name listed online } } }',
        {},
        adminCookie,
      )
      expect(botResult.body.errors).toBeUndefined()
      const created = botResult.body.data.createBot as {
        token: string
        bot: { id: string; username: string; listed: boolean }
      }
      expect(created.token.startsWith(`${created.bot.id}:`)).toBe(true)
      expect(created.bot).toMatchObject({ username: 'catalogbot', listed: true, online: false })

      const ownerResult = await graphqlRequest(
        fixture.baseUrl,
        'mutation SetOwner($botId: ID!) { setBotOwner(botId: $botId, username: "member") }',
        { botId: created.bot.id },
        adminCookie,
      )
      expect(ownerResult.body.errors).toBeUndefined()
      const ownedBot = fixture.db.select().from(bots).where(eq(bots.id, created.bot.id)).get()
      expect(ownedBot?.ownerId).toBe(
        (registration.body.data.register as { user: { id: string } }).user.id,
      )

      const resetResult = await graphqlRequest(
        fixture.baseUrl,
        'mutation ResetToken($botId: ID!) { resetBotToken(botId: $botId) { token bot { id } } }',
        { botId: created.bot.id },
        adminCookie,
      )
      const reset = resetResult.body.data.resetBotToken as { token: string }
      expect(reset.token).not.toBe(created.token)

      const hiddenResult = await graphqlRequest(
        fixture.baseUrl,
        'mutation HideBot($botId: ID!) { setBotListed(botId: $botId, listed: false) }',
        { botId: created.bot.id },
        adminCookie,
      )
      expect(hiddenResult.body.errors).toBeUndefined()
      const browseResult = await graphqlRequest(
        fixture.baseUrl,
        'query { browseBots { username } }',
        {},
        memberCookie,
      )
      expect(browseResult.body.data.browseBots).toEqual([])

      const botsResult = await graphqlRequest(
        fixture.baseUrl,
        'query { adminBots { username listed } }',
        {},
        adminCookie,
      )
      expect(botsResult.body.data.adminBots).toEqual([{ username: 'catalogbot', listed: false }])
      const unhideResult = await graphqlRequest(
        fixture.baseUrl,
        'mutation ShowBot($botId: ID!) { setBotListed(botId: $botId, listed: true) }',
        { botId: created.bot.id },
        adminCookie,
      )
      expect(unhideResult.body.errors).toBeUndefined()
      const added = await graphqlRequest(
        fixture.baseUrl,
        'mutation { addBot(username: "catalogbot") { bot { username } } }',
        {},
        memberCookie,
      )
      expect(added.body.errors).toBeUndefined()
    } finally {
      fixture.stop()
    }
  })

  test('rejects invalid bot usernames and invalid invite limits', async () => {
    const fixture = createServerFixture()
    try {
      const cookie = await login(fixture.baseUrl, 'admin', 'password123')
      const invalidBot = await graphqlRequest(
        fixture.baseUrl,
        'mutation { createBot(username: "not-a-bot", name: "Invalid", description: "") { token } }',
        {},
        cookie,
      )
      expect(invalidBot.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST')
      const invalidInvite = await graphqlRequest(
        fixture.baseUrl,
        'mutation { createInvite(maxUses: 0) { code } }',
        {},
        cookie,
      )
      expect(invalidInvite.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST')
    } finally {
      fixture.stop()
    }
  })

  // @anchor INV:admin/registration-invites
  test('edits registration roles and limits for future sign-ups and revokes a single link', async () => {
    const fixture = createServerFixture()
    try {
      const cookie = await login(fixture.baseUrl, 'admin', 'password123')
      const call = async (
        query: string,
        variables: Record<string, unknown> = {},
        authenticated = true,
      ) =>
        (
          await graphqlRequest(
            fixture.baseUrl,
            query,
            variables,
            authenticated ? cookie : undefined,
          )
        ).body
      const { data } = await call('mutation { createInvite(role: user, maxUses: 2) { code role } }')
      const { code } = data.createInvite as { code: string }
      const register =
        'mutation($code: String!, $name: String!) { register(username: $name, displayName: $name, password: "password123", invite: $code) { user { role } } }'
      expect((await call(register, { code, name: 'first' }, false)).data.register).toEqual({
        user: { role: 'user' },
      })
      expect(
        (
          await call(
            'mutation($code: String!) { editPlatformInvite(code: $code, role: admin, maxUses: 3) { role uses maxUses } }',
            { code },
          )
        ).data.editPlatformInvite,
      ).toEqual({ role: 'admin', uses: 1, maxUses: 3 })
      expect((await call(register, { code, name: 'second' }, false)).data.register).toEqual({
        user: { role: 'admin' },
      })
      expect(
        (await call('mutation($code: String!) { revokePlatformInvite(code: $code) }', { code }))
          .data.revokePlatformInvite,
      ).toBe(true)
      expect(
        (await call(register, { code, name: 'third' }, false)).errors?.[0]?.extensions?.code,
      ).toBe('FORBIDDEN')
    } finally {
      fixture.stop()
    }
  })
})
