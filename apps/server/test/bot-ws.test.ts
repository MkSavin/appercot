import { describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { createBotToken } from '../src/auth/bot-token'
import { botCommands, botEvents, bots, chats, users, userUpdates } from '../src/db/schema'
import { enqueueBotEvent } from '../src/domain/events'
import { connectBot, createServerFixture, waitFor } from './helpers'

const seedBotChat = async (fixture: ReturnType<typeof createServerFixture>) => {
  const userId = Bun.randomUUIDv7()
  const botId = Bun.randomUUIDv7()
  const chatId = Bun.randomUUIDv7()
  const token = createBotToken(botId)
  fixture.db
    .insert(users)
    .values({
      id: userId,
      username: 'alice',
      displayName: 'Alice',
      passwordHash: 'unused',
      isAdmin: false,
      createdAt: Date.now(),
    })
    .run()
  fixture.db
    .insert(bots)
    .values({
      id: botId,
      username: 'examplebot',
      name: 'Example',
      description: 'Test bot',
      tokenHash: token.hash,
      roles: [],
      defaultRoles: [],
      commandsRev: 0,
      createdAt: Date.now(),
    })
    .run()
  fixture.db
    .insert(chats)
    .values({
      id: chatId,
      userId,
      botId,
      roles: [],
      lastReadSeq: 0,
      nextSeq: 1,
      createdAt: Date.now(),
    })
    .run()
  return { userId, botId, chatId, token: token.token }
}

describe('bot WebSocket', () => {
  test('rejects an invalid token with close code 4401', async () => {
    const fixture = createServerFixture()
    try {
      const seeded = await seedBotChat(fixture)
      const client = await connectBot(fixture.baseUrl, `${seeded.botId}:invalid`)
      const code = await new Promise<number>((resolve) => {
        client.socket.addEventListener('close', (event) => resolve(event.code), { once: true })
      })
      expect(code).toBe(4401)
    } finally {
      fixture.stop()
    }
  })

  test('dispatches commands and KV methods', async () => {
    const fixture = createServerFixture()
    try {
      const seeded = await seedBotChat(fixture)
      const client = await connectBot(fixture.baseUrl, seeded.token)
      const hello = await client.next()
      expect(hello.t).toBe('hello')

      await client.call('commands', 'setCommands', {
        commands: [{ name: 'start', description: 'Start' }],
      })
      await client.call('commands-2', 'setCommands', {
        commands: [{ name: 'help', description: 'Help' }],
      })
      const commands = fixture.db
        .select()
        .from(botCommands)
        .where(eq(botCommands.botId, seeded.botId))
        .all()
      expect(commands.map((command) => command.name)).toEqual(['help'])

      const setResult = await client.call('kv-set', 'kvSet', {
        chatId: seeded.chatId,
        entries: { count: 1, nested: { ok: true } },
      })
      expect(setResult.ok).toBe(true)
      const getResult = await client.call('kv-get', 'kvGet', { chatId: seeded.chatId })
      expect(getResult.result).toEqual({ count: 1, nested: { ok: true } })

      const quotaResult = await client.call('kv-quota', 'kvSet', {
        chatId: seeded.chatId,
        entries: { oversized: 'x'.repeat(5 * 1024 * 1024 + 1) },
      })
      expect(quotaResult).toMatchObject({ ok: false, error: { code: 'KV_QUOTA' } })
      client.socket.close()
    } finally {
      fixture.stop()
    }
  })

  // @anchor INV:bot-ws/replays-outbox
  test('redelivers outbox events and removes them after ack', async () => {
    const fixture = createServerFixture()
    try {
      const seeded = await seedBotChat(fixture)
      enqueueBotEvent(fixture.db, {
        botId: seeded.botId,
        chatId: seeded.chatId,
        event: {
          type: 'chat_started',
          chat: { id: seeded.chatId, roles: [], blocked: false, createdAt: 1 },
          user: { id: seeded.userId, username: 'alice', displayName: 'Alice' },
        },
      })

      const client = await connectBot(fixture.baseUrl, seeded.token)
      expect((await client.next()).t).toBe('hello')
      const event = await client.next()
      expect(event.t).toBe('evt')
      client.socket.send(JSON.stringify({ t: 'ack', seq: event.seq }))
      await waitFor(() => fixture.db.select().from(botEvents).all().length === 0)
      expect(fixture.db.select().from(botEvents).all()).toHaveLength(0)
      client.socket.close()
    } finally {
      fixture.stop()
    }
  })

  test('publishes bot presence to users with chats', async () => {
    const fixture = createServerFixture()
    try {
      const seeded = await seedBotChat(fixture)
      const client = await connectBot(fixture.baseUrl, seeded.token)
      await client.next()
      const updates = fixture.db
        .select()
        .from(userUpdates)
        .where(eq(userUpdates.userId, seeded.userId))
        .all()
      expect(
        updates.some((update) => JSON.stringify(update.payload).includes('bot.presence')),
      ).toBe(true)
      client.socket.close()
    } finally {
      fixture.stop()
    }
  })
})
