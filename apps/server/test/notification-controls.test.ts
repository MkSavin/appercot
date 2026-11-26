import { expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { generateVAPIDKeys } from 'web-push'
import { chats } from '../src/db/schema'
import { sendBotMessage } from '../src/domain/messages'
import { PushService } from '../src/domain/push'
import { Hub } from '../src/ws/hub'
import { createServerFixture, graphqlRequest } from './helpers'

const login = async (baseUrl: string, username = 'admin') => {
  const result = await graphqlRequest(
    baseUrl,
    `mutation Login($username: String!) {
      login(username: $username, password: "password123") { user { id } }
    }`,
    { username },
  )
  const cookie = result.response.headers.get('set-cookie')
  if (!cookie) throw new Error('Cookie is missing')
  return { cookie, userId: (result.body.data.login as { user: { id: string } }).user.id }
}

const createChat = async (baseUrl: string, cookie: string, username: string) => {
  const created = await graphqlRequest(
    baseUrl,
    `mutation { createBot(username: "${username}", name: "Notification Bot", description: "") { bot { id } } }`,
    {},
    cookie,
  )
  const botId = (created.body.data.createBot as { bot: { id: string } }).bot.id
  const added = await graphqlRequest(
    baseUrl,
    `mutation { addBot(username: "${username}") { id } }`,
    {},
    cookie,
  )
  return { botId, chatId: (added.body.data.addBot as { id: string }).id }
}

test('stores mute separately from the base mode and validates ownership and timestamps', async () => {
  const fixture = createServerFixture()
  try {
    const { cookie } = await login(fixture.baseUrl)
    const { chatId } = await createChat(fixture.baseUrl, cookie, 'notifysettingsbot')
    const setMode = await graphqlRequest(
      fixture.baseUrl,
      `mutation($chatId: ID!) {
        setChatNotifications(chatId: $chatId, mode: silent) {
          id notifications notificationsMutedUntil
        }
      }`,
      { chatId },
      cookie,
    )
    expect(setMode.body.errors).toBeUndefined()
    expect(setMode.body.data.setChatNotifications).toEqual({
      id: chatId,
      notifications: 'silent',
      notificationsMutedUntil: null,
    })

    const mutedUntil = Date.now() + 60_000
    const muted = await graphqlRequest(
      fixture.baseUrl,
      `mutation($chatId: ID!, $mutedUntil: Float!) {
        setChatMute(chatId: $chatId, mutedUntil: $mutedUntil) {
          id notifications notificationsMutedUntil
        }
      }`,
      { chatId, mutedUntil },
      cookie,
    )
    expect(muted.body.data.setChatMute).toEqual({
      id: chatId,
      notifications: 'silent',
      notificationsMutedUntil: mutedUntil,
    })
    const profile = await graphqlRequest(
      fixture.baseUrl,
      'query($chatId: ID!) { chatProfile(chatId: $chatId) { notifications notificationsMutedUntil } }',
      { chatId },
      cookie,
    )
    expect(profile.body.data.chatProfile).toEqual({
      notifications: 'silent',
      notificationsMutedUntil: mutedUntil,
    })

    for (const value of [Date.now() - 1, Date.now() + 367 * 24 * 60 * 60 * 1000, 1.5]) {
      const invalid = await graphqlRequest(
        fixture.baseUrl,
        'mutation($chatId: ID!, $value: Float!) { setChatMute(chatId: $chatId, mutedUntil: $value) { id } }',
        { chatId, value },
        cookie,
      )
      expect(invalid.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST')
    }

    await graphqlRequest(
      fixture.baseUrl,
      'mutation { register(username: "outsider", password: "password123", displayName: "Outsider", invite: "bootstrap-invite") { user { id } } }',
    )
    const outsider = await login(fixture.baseUrl, 'outsider')
    const forbidden = await graphqlRequest(
      fixture.baseUrl,
      'mutation($chatId: ID!) { setChatMute(chatId: $chatId, mutedUntil: null) { id } }',
      { chatId },
      outsider.cookie,
    )
    expect(forbidden.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')

    const cleared = await graphqlRequest(
      fixture.baseUrl,
      'mutation($chatId: ID!) { setChatMute(chatId: $chatId, mutedUntil: null) { notificationsMutedUntil } }',
      { chatId },
      cookie,
    )
    expect(cleared.body.data.setChatMute).toEqual({ notificationsMutedUntil: null })
  } finally {
    fixture.stop()
  }
})

// @anchor INV:notification-controls/keeps-unread
test('temporary mute suppresses push without suppressing unread and expires without a scheduler', async () => {
  const keys = generateVAPIDKeys()
  const fixture = createServerFixture(undefined, {
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
  })
  try {
    const { cookie } = await login(fixture.baseUrl)
    const { botId, chatId } = await createChat(fixture.baseUrl, cookie, 'notifypushbot')
    const subscribed = await graphqlRequest(
      fixture.baseUrl,
      `mutation {
        subscribePush(subscription: {
          endpoint: "https://push.example.test/mute",
          expirationTime: null,
          keys: { p256dh: "public-key", auth: "auth-secret" }
        })
      }`,
      {},
      cookie,
    )
    expect(subscribed.body.errors).toBeUndefined()
    const delivered: Array<{
      title: string
      body: string
      tag: string
      url: string
      silent?: boolean
    }> = []
    const sender = async (_target: unknown, payload?: string) => {
      delivered.push(JSON.parse(payload ?? '{}'))
      return { statusCode: 201, body: '', headers: {} }
    }
    const hub = new Hub()
    const push = new PushService(fixture.db, fixture.env, sender)
    hub.onBotMessage((recipient, chat, message) => push.sendMessage(recipient, chat, message))
    const mute = await graphqlRequest(
      fixture.baseUrl,
      `mutation($chatId: ID!) {
        setChatNotifications(chatId: $chatId, mode: silent) { id }
      }`,
      { chatId },
      cookie,
    )
    expect(mute.body.errors).toBeUndefined()
    await graphqlRequest(
      fixture.baseUrl,
      'mutation($chatId: ID!, $until: Float!) { setChatMute(chatId: $chatId, mutedUntil: $until) { id } }',
      { chatId, until: Date.now() + 60_000 },
      cookie,
    )

    sendBotMessage(fixture.db, hub, botId, { chatId, content: { text: 'During mute' } })
    await Bun.sleep(30)
    expect(delivered).toHaveLength(0)
    let session = await graphqlRequest(
      fixture.baseUrl,
      'query { session { chats { unread } } }',
      {},
      cookie,
    )
    expect(session.body.data.session).toEqual({ chats: [{ unread: 1 }] })

    fixture.db
      .update(chats)
      .set({ notificationsMutedUntil: Date.now() - 1 })
      .where(eq(chats.id, chatId))
      .run()
    sendBotMessage(fixture.db, hub, botId, { chatId, content: { text: 'After mute' } })
    await Bun.sleep(30)
    expect(delivered).toEqual([
      {
        title: 'Notification Bot',
        body: 'After mute',
        tag: chatId,
        url: `/c/${chatId}`,
        silent: true,
      },
    ])
    session = await graphqlRequest(
      fixture.baseUrl,
      'query { session { chats { unread } } }',
      {},
      cookie,
    )
    expect(session.body.data.session).toEqual({ chats: [{ unread: 2 }] })
  } finally {
    fixture.stop()
  }
})
