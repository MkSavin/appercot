import { expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { bots } from '../src/db/schema'
import { setBotCommands } from '../src/domain/commands'
import { createServerFixture, graphqlRequest } from './helpers'

const detailsQuery = `
  query BrowseBot($botId: ID!) {
    browseBot(botId: $botId) {
      bot { id username name description welcome tags access }
      commands { name description shortcut }
    }
  }
`

// @anchor INV:catalog-details/protects-details
test('exposes only listed public details and commands allowed by future membership roles', async () => {
  const fixture = createServerFixture()
  try {
    const login = await graphqlRequest(
      fixture.baseUrl,
      'mutation { login(username: "admin", password: "password123") { user { id } } }',
    )
    const cookie = login.response.headers.get('set-cookie') ?? ''
    const created = await graphqlRequest(
      fixture.baseUrl,
      'mutation { createBot(username: "catalogbot", name: "Catalog Bot", description: "Full description") { bot { id } } }',
      {},
      cookie,
    )
    const botId = (created.body.data.createBot as { bot: { id: string } }).bot.id
    fixture.db
      .update(bots)
      .set({ roles: ['member'], defaultRoles: ['member'], welcome: 'Welcome', tags: ['docs'] })
      .where(eq(bots.id, botId))
      .run()
    setBotCommands(fixture.db, botId, {
      commands: [
        { name: 'start', description: 'Public start', shortcut: 'Alt+S' },
        { name: 'member', description: 'Member command', roles: ['member'] },
        { name: 'owner', description: 'Owner command', roles: ['owner'] },
      ],
    })

    await graphqlRequest(
      fixture.baseUrl,
      'mutation { register(username: "cataloguser", password: "password123", displayName: "Catalog User", invite: "bootstrap-invite") { user { id } } }',
    )
    const memberLogin = await graphqlRequest(
      fixture.baseUrl,
      'mutation { login(username: "cataloguser", password: "password123") { user { id } } }',
    )
    const memberCookie = memberLogin.response.headers.get('set-cookie') ?? ''

    const anonymous = await graphqlRequest(fixture.baseUrl, detailsQuery, { botId })
    expect(anonymous.body.errors?.length).toBeGreaterThan(0)
    const details = await graphqlRequest(fixture.baseUrl, detailsQuery, { botId }, memberCookie)
    expect(details.body.errors).toBeUndefined()
    expect(details.body.data.browseBot).toEqual({
      bot: {
        id: botId,
        username: 'catalogbot',
        name: 'Catalog Bot',
        description: 'Full description',
        welcome: 'Welcome',
        tags: ['docs'],
        access: 'public',
      },
      commands: [
        { name: 'start', description: 'Public start', shortcut: 'Alt+S' },
        { name: 'member', description: 'Member command', shortcut: null },
      ],
    })
    expect(JSON.stringify(details.body.data.browseBot)).not.toContain('Owner command')
    expect(JSON.stringify(details.body.data.browseBot)).not.toContain('ownerId')

    const added = await graphqlRequest(
      fixture.baseUrl,
      'mutation { addBot(username: "catalogbot") { commands { name } } }',
      {},
      memberCookie,
    )
    expect(added.body.data.addBot).toEqual({ commands: [{ name: 'start' }, { name: 'member' }] })

    const privateCreated = await graphqlRequest(
      fixture.baseUrl,
      'mutation { createBot(username: "privatebot", name: "Private Bot", description: "Secret") { bot { id } } }',
      {},
      cookie,
    )
    const privateId = (privateCreated.body.data.createBot as { bot: { id: string } }).bot.id
    fixture.db.update(bots).set({ access: 'by_link' }).where(eq(bots.id, privateId)).run()
    const hiddenCreated = await graphqlRequest(
      fixture.baseUrl,
      'mutation { createBot(username: "unlistedbot", name: "Unlisted Bot", description: "Hidden") { bot { id } } }',
      {},
      cookie,
    )
    const hiddenId = (hiddenCreated.body.data.createBot as { bot: { id: string } }).bot.id
    fixture.db.update(bots).set({ listed: false }).where(eq(bots.id, hiddenId)).run()

    for (const unavailableId of [privateId, hiddenId, 'missing-bot']) {
      const unavailable = await graphqlRequest(
        fixture.baseUrl,
        detailsQuery,
        { botId: unavailableId },
        memberCookie,
      )
      expect(unavailable.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND')
    }
    const list = await graphqlRequest(
      fixture.baseUrl,
      'query { browseBots { id } }',
      {},
      memberCookie,
    )
    expect(JSON.stringify(list.body.data.browseBots)).not.toContain(privateId)
    expect(JSON.stringify(list.body.data.browseBots)).not.toContain(hiddenId)
  } finally {
    fixture.stop()
  }
})
