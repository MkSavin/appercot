import { describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { createBotToken } from '../src/auth/bot-token'
import { botEvents, bots, messages, users } from '../src/db/schema'
import { addBot as installBot } from '../src/domain/chats'
import { flushBotEvents } from '../src/domain/events'
import { sendUserMessage } from '../src/domain/messages'
import { setBotRoles, setChatRoles } from '../src/domain/roles'
import { Hub } from '../src/ws/hub'
import { type BotTestClient, connectBot, createServerFixture, graphqlRequest } from './helpers'

const loginAdmin = async (baseUrl: string) => {
  const result = await graphqlRequest(
    baseUrl,
    'mutation { login(username: "admin", password: "password123") { user { id } } }',
  )
  const cookie = result.response.headers.get('set-cookie')
  if (!cookie) throw new Error('Session cookie is missing')
  return cookie
}

const seedBot = (fixture: ReturnType<typeof createServerFixture>) => {
  const botId = Bun.randomUUIDv7()
  const token = createBotToken(botId)
  fixture.db
    .insert(bots)
    .values({
      id: botId,
      username: 'messagingbot',
      name: 'Messaging',
      description: 'Integration bot',
      tokenHash: token.hash,
      roles: ['admin'],
      defaultRoles: [],
      commandsRev: 0,
      createdAt: Date.now(),
    })
    .run()
  return { botId, token: token.token }
}

const addBot = async (baseUrl: string, cookie: string) => {
  const result = await graphqlRequest(
    baseUrl,
    'mutation { addBot(username: "messagingbot") { id bot { id username } blocked roles } }',
    {},
    cookie,
  )
  expect(result.body.errors).toBeUndefined()
  return (result.body.data.addBot as { id: string }).id
}

const sendText = async (
  baseUrl: string,
  cookie: string,
  chatId: string,
  text: string,
  clientId: string,
) => {
  const result = await graphqlRequest(
    baseUrl,
    `mutation Send($input: SendMessageInput!) {
      sendMessage(input: $input) { id chatId seq status content sender }
    }`,
    { input: { chatId, clientId, content: { text } } },
    cookie,
  )
  return result.body
}

class UserTestClient {
  readonly socket: WebSocket
  private readonly frames: Array<{
    t: string
    seq?: number
    update?: { type: string; [key: string]: unknown }
  }> = []
  private readonly waiters: Array<(frame: (typeof this.frames)[number]) => void> = []

  constructor(baseUrl: string, cookie: string) {
    this.socket = new WebSocket(`${baseUrl.replace('http:', 'ws:')}/api/ws`, {
      headers: { cookie },
    } as never)
    this.socket.addEventListener('message', (event) => {
      const frame = JSON.parse(String(event.data)) as (typeof this.frames)[number]
      const waiter = this.waiters.shift()
      if (waiter) waiter(frame)
      else this.frames.push(frame)
    })
  }

  async open() {
    await new Promise<void>((resolve, reject) => {
      this.socket.addEventListener('open', () => resolve(), { once: true })
      this.socket.addEventListener('error', () => reject(new Error('User WebSocket failed')), {
        once: true,
      })
    })
  }

  async next() {
    const frame = this.frames.shift()
    if (frame) return frame
    return Promise.race([
      new Promise<(typeof this.frames)[number]>((resolve) => this.waiters.push(resolve)),
      new Promise<(typeof this.frames)[number]>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for a user update')), 3000),
      ),
    ])
  }
}

const acknowledgeEvent = async (client: BotTestClient, expectedType: string) => {
  const frame = await client.next()
  expect(frame.t).toBe('evt')
  expect((frame.event as { type: string }).type).toBe(expectedType)
  client.socket.send(JSON.stringify({ t: 'ack', seq: frame.seq }))
  return frame
}

describe('messaging integration', () => {
  test('delivers messages, statuses and commands with role checks', async () => {
    const fixture = createServerFixture()
    try {
      const cookie = await loginAdmin(fixture.baseUrl)
      const seeded = seedBot(fixture)
      const bot = await connectBot(fixture.baseUrl, seeded.token)
      expect((await bot.next()).t).toBe('hello')
      const chatId = await addBot(fixture.baseUrl, cookie)
      await acknowledgeEvent(bot, 'chat_started')
      await bot.call('commands', 'setCommands', {
        commands: [
          { name: 'start', description: 'Start' },
          { name: 'admin', description: 'Admin', roles: ['admin'] },
        ],
      })
      const visibleCommands = await graphqlRequest(
        fixture.baseUrl,
        'query { session { chats { commands { name description } } } }',
        {},
        cookie,
      )
      expect(visibleCommands.body.errors).toBeUndefined()
      expect(visibleCommands.body.data.session).toMatchObject({
        chats: [{ commands: [{ name: 'start', description: 'Start' }] }],
      })
      const user = new UserTestClient(fixture.baseUrl, cookie)
      await user.open()

      const sent = await sendText(fixture.baseUrl, cookie, chatId, 'Hello', 'client-1')
      expect(sent.errors).toBeUndefined()
      const event = await acknowledgeEvent(bot, 'message')
      const userMessage = (event.event as { message: { id: string } }).message
      await bot.call('reply', 'sendMessage', { chatId, content: { text: 'Reply' } })

      const updateTypes: string[] = []
      let unread: number | undefined
      while (
        !updateTypes.includes('message.status') ||
        unread !== 2 ||
        updateTypes.filter((type) => type === 'message.new').length < 2
      ) {
        const update = await user.next()
        if (update.update) updateTypes.push(update.update.type)
        if (update.update?.type === 'chat.updated') {
          unread = (update.update as unknown as { chat: { unread: number } }).chat.unread
        }
      }
      expect(updateTypes).toContain('message.status')
      expect(updateTypes.filter((type) => type === 'message.new')).toHaveLength(2)
      expect(unread).toBe(2)

      const history = await graphqlRequest(
        fixture.baseUrl,
        'query($chatId: ID!) { messages(chatId: $chatId) { id sender content status } }',
        { chatId },
        cookie,
      )
      expect(history.body.data.messages as unknown[]).toHaveLength(2)
      expect(userMessage.id).toBe((sent.data.sendMessage as { id: string }).id)

      await sendText(fixture.baseUrl, cookie, chatId, '/start', 'client-2')
      await acknowledgeEvent(bot, 'command')
      await sendText(fixture.baseUrl, cookie, chatId, '/admin', 'client-3')
      const systemUpdate = await user.next()
      expect(systemUpdate.update?.type).toBe('message.new')
      bot.socket.send(JSON.stringify({ t: 'req', id: 'me', method: 'getMe', params: {} }))
      expect((await bot.next()).t).toBe('res')

      const sync = await graphqlRequest(
        fixture.baseUrl,
        'query { sync(since: 0) { resetRequired updates { seq payload } } }',
        {},
        cookie,
      )
      expect(sync.body.data.sync).toMatchObject({ resetRequired: false })
      expect((sync.body.data.sync as { updates: unknown[] }).updates.length).toBeGreaterThan(0)
      user.socket.close()
      bot.socket.close()
    } finally {
      fixture.stop()
    }
  })

  // @anchor INV:messaging/idempotent-send
  test('keeps send idempotent and supports block and read without a clear mutation', async () => {
    const fixture = createServerFixture()
    try {
      const cookie = await loginAdmin(fixture.baseUrl)
      const seeded = seedBot(fixture)
      const chatId = await addBot(fixture.baseUrl, cookie)
      const first = await sendText(fixture.baseUrl, cookie, chatId, 'Once', 'same-client')
      const second = await sendText(fixture.baseUrl, cookie, chatId, 'Once', 'same-client')
      expect(first.data.sendMessage).toEqual(second.data.sendMessage)

      const marked = await graphqlRequest(
        fixture.baseUrl,
        'mutation($chatId: ID!) { markRead(chatId: $chatId, seq: 1) }',
        { chatId },
        cookie,
      )
      expect(marked.body.errors).toBeUndefined()
      const blocked = await graphqlRequest(
        fixture.baseUrl,
        'mutation($chatId: ID!) { blockBot(chatId: $chatId, blocked: true) }',
        { chatId },
        cookie,
      )
      expect(blocked.body.errors).toBeUndefined()
      expect(
        (await sendText(fixture.baseUrl, cookie, chatId, 'Blocked', 'blocked-client')).errors?.[0]
          ?.extensions?.code,
      ).toBe('FORBIDDEN')
      const cleared = await graphqlRequest(
        fixture.baseUrl,
        'mutation($chatId: ID!) { clearChat(chatId: $chatId) }',
        { chatId },
        cookie,
      )
      expect(cleared.body.errors?.[0]?.message).toContain('Cannot query field "clearChat"')
      const history = await graphqlRequest(
        fixture.baseUrl,
        'query($chatId: ID!) { messages(chatId: $chatId) { id } }',
        { chatId },
        cookie,
      )
      expect(history.body.data.messages).not.toEqual([])
      const administrator = fixture.db.select().from(users).where(eq(users.username, 'admin')).get()
      expect(administrator).toBeDefined()
      expect(seeded.botId).toBeDefined()
    } finally {
      fixture.stop()
    }
  })

  // @anchor INV:messaging/keeps-read
  test('keeps read progress when a second tab sends an older sequence', async () => {
    const fixture = createServerFixture()
    try {
      const cookie = await loginAdmin(fixture.baseUrl)
      seedBot(fixture)
      const chatId = await addBot(fixture.baseUrl, cookie)
      await sendText(fixture.baseUrl, cookie, chatId, 'First', 'first-read')
      await sendText(fixture.baseUrl, cookie, chatId, 'Second', 'second-read')
      for (const seq of [2, 1]) {
        const marked = await graphqlRequest(
          fixture.baseUrl,
          'mutation($chatId: ID!, $seq: Int!) { markRead(chatId: $chatId, seq: $seq) }',
          { chatId, seq },
          cookie,
        )
        expect(marked.body.errors).toBeUndefined()
      }
      const session = await graphqlRequest(
        fixture.baseUrl,
        'query { session { chats { id unread } } }',
        {},
        cookie,
      )
      expect(session.body.data).toEqual({ session: { chats: [{ id: chatId, unread: 0 }] } })
    } finally {
      fixture.stop()
    }
  })

  // @anchor INV:messaging/rechecks-command
  test('drops a queued command if the membership loses its role before delivery', () => {
    const fixture = createServerFixture()
    try {
      const hub = new Hub()
      const { botId } = seedBot(fixture)
      const user = fixture.db.select().from(users).where(eq(users.username, 'admin')).get()
      if (!user) throw new Error('Missing fixture owner')
      setBotRoles(fixture.db, hub, botId, {
        roles: ['operator'],
        defaultRoles: ['operator'],
        commands: [{ name: 'operate', description: 'Operate', roles: ['operator'] }],
      })
      const { id: chatId } = installBot(fixture.db, hub, user.id, 'messagingbot')
      const command = sendUserMessage(fixture.db, hub, user.id, {
        chatId,
        clientId: 'queued',
        content: { text: '/operate' },
      })
      expect(command.status).toBe('accepted')
      expect(
        fixture.db
          .select()
          .from(botEvents)
          .all()
          .some(({ payload }) => payload.type === 'command'),
      ).toBe(true)

      setChatRoles(fixture.db, hub, botId, { chatId, roles: [] })
      const delivered: string[] = []
      hub.connectBot(botId, { send: (data) => delivered.push(data), close: () => {} })
      flushBotEvents(fixture.db, hub, botId)

      expect(delivered).toHaveLength(2)
      expect(delivered.join(' ')).not.toContain('"type":"command"')
      expect(
        fixture.db.select().from(messages).where(eq(messages.id, command.id)).get()?.status,
      ).toBe('processed')
    } finally {
      fixture.stop()
    }
  })

  test('answers callback buttons with a toast', async () => {
    const fixture = createServerFixture()
    try {
      const cookie = await loginAdmin(fixture.baseUrl)
      const seeded = seedBot(fixture)
      const bot = await connectBot(fixture.baseUrl, seeded.token)
      await bot.next()
      const chatId = await addBot(fixture.baseUrl, cookie)
      await acknowledgeEvent(bot, 'chat_started')
      const sent = await bot.call('buttons', 'sendMessage', {
        chatId,
        content: { text: 'Choose', buttons: [[{ text: 'OK', callback: 'confirm' }]] },
      })
      const messageId = (sent.result as { id: string }).id
      const pressing = graphqlRequest(
        fixture.baseUrl,
        'mutation($chatId: ID!, $messageId: ID!) { pressButton(chatId: $chatId, messageId: $messageId, data: "confirm") { toast } }',
        { chatId, messageId },
        cookie,
      )
      const callback = await bot.next()
      expect(callback.t).toBe('evt')
      const callbackId = (callback.event as { callbackId: string }).callbackId
      await bot.call('answer', 'answerCallback', { callbackId, toast: 'Done' })
      const result = await pressing
      expect(result.body.data.pressButton).toEqual({ toast: 'Done' })
      bot.socket.close()
    } finally {
      fixture.stop()
    }
  })
})
