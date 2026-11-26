import { describe, expect, test } from 'bun:test'
import { generateVAPIDKeys } from 'web-push'
import { pushSubs } from '../src/db/schema'
import { sendBotMessage } from '../src/domain/messages'
import { PushService } from '../src/domain/push'
import { Hub, type SocketLike } from '../src/ws/hub'
import { createServerFixture, graphqlRequest, waitFor } from './helpers'

const subscription = {
  endpoint: 'https://push.example.test/subscription',
  expirationTime: null,
  keys: { p256dh: 'public-key', auth: 'auth-secret' },
}

describe('Web Push', () => {
  test('stores subscriptions, notifies unfocused chats and prunes expired endpoints', async () => {
    const keys = generateVAPIDKeys()
    const fixture = createServerFixture(undefined, {
      VAPID_PUBLIC_KEY: keys.publicKey,
      VAPID_PRIVATE_KEY: keys.privateKey,
    })
    try {
      const login = await graphqlRequest(
        fixture.baseUrl,
        'mutation { login(username: "admin", password: "password123") { user { id } } }',
      )
      const cookie = login.response.headers.get('set-cookie')
      if (!cookie) throw new Error('Cookie is missing')
      const userId = (login.body.data.login as { user: { id: string } }).user.id
      const created = await graphqlRequest(
        fixture.baseUrl,
        'mutation { createBot(username: "pushbot", name: "Push Bot", description: "Push") { bot { id } } }',
        {},
        cookie,
      )
      const botId = (created.body.data.createBot as { bot: { id: string } }).bot.id
      const added = await graphqlRequest(
        fixture.baseUrl,
        'mutation { addBot(username: "pushbot") { id } }',
        {},
        cookie,
      )
      const chatId = (added.body.data.addBot as { id: string }).id
      const subscribed = await graphqlRequest(
        fixture.baseUrl,
        'mutation Subscribe($subscription: JSON!) { subscribePush(subscription: $subscription) }',
        { subscription },
        cookie,
      )
      expect(subscribed.body.errors).toBeUndefined()
      expect(fixture.db.select().from(pushSubs).all()).toHaveLength(1)

      const delivered: Array<{ payload: string }> = []
      let failDelivery = false
      const hub = new Hub()
      const sender = async (_target: unknown, payload?: string) => {
        if (!payload) throw new Error('Payload is required')
        delivered.push({ payload })
        if (failDelivery) throw { statusCode: 410 }
        return { statusCode: 201, body: '', headers: {} }
      }
      const push = new PushService(fixture.db, fixture.env, sender)
      hub.onBotMessage((recipient, chat, message) => push.sendMessage(recipient, chat, message))

      sendBotMessage(fixture.db, hub, botId, {
        chatId,
        content: { text: 'New message' },
      })
      await waitFor(() => delivered.length === 1)
      const firstDelivery = delivered[0]
      if (!firstDelivery) throw new Error('Push payload is missing')
      expect(JSON.parse(firstDelivery.payload)).toEqual({
        title: 'Push Bot',
        body: 'New message',
        tag: chatId,
        url: `/c/${chatId}`,
      })

      const socket: SocketLike = { send: () => {}, close: () => {} }
      hub.connectUser(userId, socket)
      hub.setFocusedChat(socket, chatId)
      sendBotMessage(fixture.db, hub, botId, { chatId, content: { text: 'Focused' } })
      await Bun.sleep(20)
      expect(delivered).toHaveLength(1)

      hub.disconnectUser(userId, socket)
      const setMode = (mode: string) =>
        graphqlRequest(
          fixture.baseUrl,
          'mutation($chat: ID!, $mode: ChatNotifications!) { setChatNotifications(chatId: $chat, mode: $mode) { id } }',
          { chat: chatId, mode },
          cookie,
        )
      expect((await setMode('off')).body.data.setChatNotifications).toEqual({ id: chatId })
      sendBotMessage(fixture.db, hub, botId, { chatId, content: { text: 'Muted' } })
      expect(delivered).toHaveLength(1)
      expect((await setMode('silent')).body.data.setChatNotifications).toEqual({ id: chatId })
      sendBotMessage(fixture.db, hub, botId, { chatId, content: { text: 'Quiet' } })
      await waitFor(() => delivered.length === 2)
      expect(JSON.parse(delivered[1]?.payload ?? '')).toMatchObject({ body: 'Quiet', silent: true })

      failDelivery = true
      sendBotMessage(fixture.db, hub, botId, { chatId, content: { text: 'Expired' } })
      await waitFor(() => fixture.db.select().from(pushSubs).all().length === 0)

      const unsubscribed = await graphqlRequest(
        fixture.baseUrl,
        'mutation Unsubscribe($endpoint: String!) { unsubscribePush(endpoint: $endpoint) }',
        { endpoint: subscription.endpoint },
        cookie,
      )
      expect(unsubscribed.body.errors).toBeUndefined()
      expect(unsubscribed.body.data.unsubscribePush).toBe(true)
      const reSubscribed = await graphqlRequest(
        fixture.baseUrl,
        'mutation Subscribe($subscription: JSON!) { subscribePush(subscription: $subscription) }',
        { subscription },
        cookie,
      )
      expect(reSubscribed.body.data.subscribePush).toBe(true)
      const active = await graphqlRequest(
        fixture.baseUrl,
        'query { mySessions { id } }',
        {},
        cookie,
      )
      const [session] = active.body.data.mySessions as [{ id: string }]
      const revoke = await graphqlRequest(
        fixture.baseUrl,
        'mutation($id: ID!) { revokeMySession(id: $id) }',
        { id: session.id },
        cookie,
      )
      expect(revoke.body.data.revokeMySession).toBe(true)
      expect(fixture.db.select().from(pushSubs).all()).toHaveLength(0)
    } finally {
      fixture.stop()
    }
  })

  test('rejects subscriptions when VAPID is not configured', async () => {
    const fixture = createServerFixture()
    try {
      const login = await graphqlRequest(
        fixture.baseUrl,
        'mutation { login(username: "admin", password: "password123") { user { id } } }',
      )
      const cookie = login.response.headers.get('set-cookie')
      if (!cookie) throw new Error('Cookie is missing')
      const result = await graphqlRequest(
        fixture.baseUrl,
        'mutation Subscribe($subscription: JSON!) { subscribePush(subscription: $subscription) }',
        { subscription },
        cookie,
      )
      expect(result.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST')
    } finally {
      fixture.stop()
    }
  })
})
