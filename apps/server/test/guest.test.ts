import { expect, test } from 'bun:test'
import { connectBot, createServerFixture, graphqlRequest } from './helpers'

const guestQuery =
  'query { guestChat(username: "demobot") { active commands { name shortcut } messages { content } } }'
const guestOpen = 'mutation { openGuestChat(username: "demobot") }'
const guestSend =
  'mutation($command: String!, $id: String!) { sendGuestCommand(username: "demobot", command: $command, clientId: $id) }'
const registration =
  'mutation { register(username: "visitor", displayName: "Visitor", password: "password123", invite: "bootstrap-invite") { user { id } } }'

// @anchor INV:guest/isolates-commands
test('isolates guest chats and requires an explicit guest grant on commands', async () => {
  const fixture = createServerFixture()
  try {
    const call = (query: string, variables: Record<string, unknown> = {}, cookie?: string) =>
      graphqlRequest(fixture.baseUrl, query, variables, cookie)
    const login = await call(
      'mutation { login(username: "admin", password: "password123") { user { id } } }',
    )
    const owner = login.response.headers.get('set-cookie') ?? ''
    const created = await call(
      'mutation { createBot(username: "demobot", name: "Demo", description: "") { bot { id } token } }',
      {},
      owner,
    )
    const { bot, token } = created.body.data.createBot as { bot: { id: string }; token: string }
    expect((await call(guestQuery)).body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND')
    const socket = await connectBot(fixture.baseUrl, token)
    try {
      expect((await socket.next()).t).toBe('hello')
      expect(
        (
          await socket.call('roles', 'setRoles', {
            roles: [{ code: 'user', name: 'Участник' }],
            commands: [
              {
                name: 'help',
                description: 'Help',
                roles: ['guest', 'all'],
                shortcut: 'Mod+Shift+H',
              },
              { name: 'private', description: 'Private', roles: ['all'] },
              { name: 'implicit', description: 'Implicit default' },
            ],
          })
        ).ok,
      ).toBe(true)
      const toggle =
        'mutation($bot: ID!, $enabled: Boolean!) { setBotGuestAccess(botId: $bot, enabled: $enabled) { guestAccess } }'
      expect(
        (await call(toggle, { bot: bot.id, enabled: true }, owner)).body.data.setBotGuestAccess,
      ).toEqual({ guestAccess: true })
      const opened = await call(guestOpen)
      const cookie = opened.response.headers.get('set-cookie')?.split(';')[0]
      if (!cookie) throw new Error('Expected guest cookie')
      expect((await call(guestQuery, {}, cookie)).body.data.guestChat).toEqual({
        active: true,
        commands: [{ name: 'help', shortcut: 'Mod+Shift+H' }],
        messages: [],
      })
      for (const command of ['/private', '/implicit', 'hello', '/help other text']) {
        expect(
          (await call(guestSend, { command, id: 'forbidden' }, cookie)).body.errors?.[0]?.extensions
            ?.code,
        ).toBe('FORBIDDEN')
      }
      expect(
        (await call(guestSend, { command: '/help', id: 'good' }, cookie)).body.data
          .sendGuestCommand,
      ).toBe(true)
      const { event } = await socket.next()
      expect(event).toMatchObject({ type: 'command', name: 'help', chat: { roles: ['guest'] } })
      const { chat } = event as { chat: { id: string } }
      expect(
        (await socket.call('assign', 'setChatRoles', { chatId: chat.id, roles: ['user'] })).ok,
      ).toBe(false)
      expect(
        (
          await socket.call('reply', 'sendMessage', {
            chatId: chat.id,
            content: { text: 'Hello guest' },
          })
        ).ok,
      ).toBe(true)
      expect((await call(guestQuery, {}, cookie)).body.data.guestChat).toMatchObject({
        active: true,
        messages: [{ content: { text: '/help' } }, { content: { text: 'Hello guest' } }],
      })
      expect((await call(guestQuery)).body.data.guestChat).toMatchObject({
        active: false,
        messages: [],
      })
      expect(
        (await call('query { session { user { id } } }', {}, cookie)).body.errors?.[0]?.extensions
          ?.code,
      ).toBe('UNAUTHORIZED')
      expect(
        (
          await call(
            'query($chat: ID!) { messages(chatId: $chat) { id } }',
            { chat: chat.id },
            owner,
          )
        ).body.errors?.[0]?.extensions?.code,
      ).toBe('FORBIDDEN')
      await call(toggle, { bot: bot.id, enabled: false }, owner)
      expect(
        (await call(guestSend, { command: '/help', id: 'again' }, cookie)).body.errors?.[0]
          ?.extensions?.code,
      ).toBe('NOT_FOUND')
    } finally {
      socket.socket.close()
    }
  } finally {
    fixture.stop()
  }
})

// @anchor INV:guest/configures-registration
test('stops registration and new user invitations with independent settings', async () => {
  for (const allowRegistration of [true, false]) {
    const fixture = createServerFixture(undefined, {
      ALLOW_REGISTRATION: String(allowRegistration),
      ALLOW_USER_INVITES: 'false',
    })
    try {
      const login = await graphqlRequest(
        fixture.baseUrl,
        'mutation { login(username: "admin", password: "password123") { user { id } } }',
      )
      const owner = login.response.headers.get('set-cookie') ?? ''
      const policy = await graphqlRequest(
        fixture.baseUrl,
        'query { registrationPolicy { registration invitations } }',
      )
      expect(policy.body.data.registrationPolicy).toEqual({
        registration: allowRegistration,
        invitations: false,
      })
      const invite = await graphqlRequest(
        fixture.baseUrl,
        'mutation { createInvite { code } }',
        {},
        owner,
      )
      expect(invite.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
      const response = await graphqlRequest(fixture.baseUrl, registration)
      if (allowRegistration) expect(response.body.errors).toBeUndefined()
      else expect(response.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    } finally {
      fixture.stop()
    }
  }
})
