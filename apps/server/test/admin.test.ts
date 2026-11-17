import { describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { bots } from '../src/db/schema'
import { createServerFixture, graphqlRequest } from './helpers'

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
})
