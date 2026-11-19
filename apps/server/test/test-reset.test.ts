import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { and, eq } from 'drizzle-orm'
import { loginUser } from '../src/auth/session'
import { createDatabase, type DatabaseContext } from '../src/db/client'
import {
  botEvents,
  bots,
  chatKv,
  chats,
  files,
  messages,
  sessions,
  testFileDeletions,
  users,
} from '../src/db/schema'
import { createMediaStorage, type MediaStorage } from '../src/domain/media-storage'
import { latestUserSequence, syncUserUpdates } from '../src/domain/sync'
import { type AppEnv, loadEnv } from '../src/env'
import { parseTestConfig } from '../src/test/config'
import { createTestFixtureOperations, type TestFixtureOperations } from '../src/test/fixtures'
import { seedTestFixtures, type TestBaseline } from '../src/test/seed'
import { Hub } from '../src/ws/hub'

const testConfig = () =>
  parseTestConfig({
    users: [
      { id: 'user-alice', username: 'alice', displayName: 'Alice', password: 'alice-password' },
      { id: 'user-bob', username: 'bob', displayName: 'Bob', password: 'bob-password' },
    ],
    bots: [
      {
        id: 'bot-echo',
        username: 'echo_bot',
        name: 'Echo',
        owner: 'alice',
        token: 'bot-echo:secret',
      },
      {
        id: 'bot-other',
        username: 'other_bot',
        name: 'Other',
        owner: 'alice',
        token: 'bot-other:secret',
      },
    ],
    chats: [
      {
        id: 'chat-echo',
        user: 'alice',
        bot: 'echo_bot',
        messages: [{ id: 'message-baseline', sender: 'bot', content: { text: 'Baseline' } }],
      },
      {
        id: 'chat-neighbor',
        user: 'alice',
        bot: 'other_bot',
        messages: [{ id: 'message-neighbor', sender: 'bot', content: { text: 'Neighbor' } }],
      },
      { id: 'chat-bob', user: 'bob', bot: 'echo_bot', messages: [] },
    ],
    test: { token: 'control-secret' },
  })

describe('test fixture operations and reset', () => {
  let directory: string
  let database: DatabaseContext
  let env: AppEnv
  let hub: Hub
  let baseline: TestBaseline
  let storage: MediaStorage
  let operations: TestFixtureOperations

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'appercot-reset-'))
    database = createDatabase(':memory:')
    env = loadEnv({ DATA_DIR: directory, PUBLIC_URL: 'http://localhost' })
    hub = new Hub()
    baseline = seedTestFixtures(database.db, env, testConfig())
    storage = createMediaStorage(env)
    operations = createTestFixtureOperations({ db: database.db, hub, baseline, storage })
  })

  afterEach(async () => {
    database.sqlite.close()
    await rm(directory, { recursive: true, force: true })
  })

  test('creates runtime fixtures and sends through the normal user and bot paths', async () => {
    const user = await operations.createUser({
      username: 'charlie',
      displayName: 'Charlie',
      password: 'charlie-password',
    })
    const bot = operations.createBot({ username: 'runtime_bot', name: 'Runtime', ownerId: user.id })
    const login = await loginUser(database.db, {
      username: 'charlie',
      password: 'charlie-password',
    })
    expect(login.user.id).toBe(user.id)
    expect(bot.token.startsWith(`${bot.id}:`)).toBe(true)

    const chat = operations.createChat({ userId: user.id, botId: bot.id })
    const userMessage = operations.sendMessage({
      chatId: chat.id,
      sender: 'user',
      clientId: 'runtime-1',
      content: { text: 'hello' },
    })
    const retry = operations.sendMessage({
      chatId: chat.id,
      sender: 'user',
      clientId: 'runtime-1',
      content: { text: 'hello' },
    })
    const botMessage = operations.sendMessage({
      chatId: chat.id,
      sender: 'bot',
      content: { text: 'answer' },
    })
    expect(retry.id).toBe(userMessage.id)
    expect(botMessage.sender).toBe('bot')
    expect(
      database.db.select().from(messages).where(eq(messages.chatId, chat.id)).all(),
    ).toHaveLength(2)
    expect(
      database.db.select().from(botEvents).where(eq(botEvents.chatId, chat.id)).all(),
    ).toHaveLength(2)
  })

  test('flushChat restores baseline history, removes registered files and forces a full sync', async () => {
    operations.sendMessage({
      chatId: 'chat-echo',
      sender: 'user',
      clientId: 'runtime-message',
      content: { text: 'runtime' },
    })
    database.db
      .insert(chatKv)
      .values({ chatId: 'chat-echo', key: 'state', value: '{}', size: 2 })
      .run()
    await storage.write('local', 'file-1', new Uint8Array([1]), 'application/octet-stream')
    await storage.write('local', 'file-1', new Uint8Array([2]), 'image/jpeg', true)
    database.db
      .insert(files)
      .values({
        id: 'file-1',
        ownerType: 'user',
        ownerId: 'user-alice',
        chatId: 'chat-echo',
        originChatId: 'chat-echo',
        mime: 'application/octet-stream',
        size: 1,
        name: 'one.bin',
        createdAt: Date.now(),
      })
      .run()
    const login = await loginUser(database.db, { username: 'alice', password: 'alice-password' })
    const oldCheckpoint = latestUserSequence(database.db, 'user-alice')

    await operations.flushChat('chat-echo')

    expect(
      database.db
        .select()
        .from(messages)
        .where(eq(messages.chatId, 'chat-echo'))
        .all()
        .map(({ id }) => id),
    ).toEqual(['message-baseline'])
    expect(
      database.db.select().from(messages).where(eq(messages.chatId, 'chat-neighbor')).all(),
    ).toHaveLength(1)
    expect(
      database.db.select().from(chatKv).where(eq(chatKv.chatId, 'chat-echo')).all(),
    ).toHaveLength(0)
    expect(
      database.db.select().from(botEvents).where(eq(botEvents.chatId, 'chat-echo')).all(),
    ).toHaveLength(0)
    expect(
      database.db.select().from(sessions).where(eq(sessions.id, login.sessionId)).all(),
    ).toHaveLength(1)
    expect(syncUserUpdates(database.db, 'user-alice', oldCheckpoint).resetRequired).toBe(true)
    expect(await storage.blob('local', 'file-1').exists()).toBe(false)
    expect(await storage.blob('local', 'file-1', true).exists()).toBe(false)
  })

  test('flushUser preserves profile and bots but revokes sessions and only its chats', async () => {
    const login = await loginUser(database.db, { username: 'alice', password: 'alice-password' })
    await operations.flushUser('user-alice')

    expect(database.db.select().from(users).where(eq(users.id, 'user-alice')).get()).toMatchObject({
      username: 'alice',
      displayName: 'Alice',
    })
    expect(
      database.db.select().from(bots).where(eq(bots.ownerId, 'user-alice')).all(),
    ).toHaveLength(2)
    expect(
      database.db.select().from(chats).where(eq(chats.userId, 'user-alice')).all(),
    ).toHaveLength(0)
    expect(database.db.select().from(chats).where(eq(chats.userId, 'user-bob')).all()).toHaveLength(
      1,
    )
    expect(
      database.db.select().from(sessions).where(eq(sessions.id, login.sessionId)).all(),
    ).toHaveLength(0)
  })

  test('deleteUser nulls bot ownership and deleteChat preserves neighboring chats', async () => {
    await operations.deleteChat('chat-echo')
    expect(database.db.select().from(chats).where(eq(chats.id, 'chat-echo')).all()).toHaveLength(0)
    expect(
      database.db.select().from(chats).where(eq(chats.id, 'chat-neighbor')).all(),
    ).toHaveLength(1)
    await expect(operations.deleteChat('chat-echo')).rejects.toMatchObject({
      code: 'TEST_FIXTURE_NOT_FOUND',
      status: 404,
    })

    await operations.deleteUser('user-alice')
    expect(database.db.select().from(users).where(eq(users.id, 'user-alice')).all()).toHaveLength(0)
    expect(
      database.db
        .select()
        .from(bots)
        .where(and(eq(bots.id, 'bot-echo')))
        .get()?.ownerId,
    ).toBeNull()
    expect(database.db.select().from(chats).where(eq(chats.id, 'chat-bob')).all()).toHaveLength(1)
  })

  test('flushState restores the same baseline and keeps global event sequences monotonic', async () => {
    const chat = operations.createChat({ userId: 'user-bob', botId: 'bot-other' })
    operations.sendMessage({
      chatId: chat.id,
      sender: 'user',
      clientId: 'before-reset',
      content: { text: 'one' },
    })
    const previous = database.sqlite
      .query("SELECT seq FROM sqlite_sequence WHERE name = 'bot_events'")
      .get() as { seq: number }

    await operations.flushState()
    expect(operations.fixtures()).toEqual(baseline.fixtures())
    expect(
      database.db
        .select()
        .from(chats)
        .all()
        .map(({ id }) => id)
        .sort(),
    ).toEqual(['chat-bob', 'chat-echo', 'chat-neighbor'])
    expect(
      database.db
        .select()
        .from(messages)
        .where(eq(messages.chatId, 'chat-echo'))
        .all()
        .map(({ id }) => id),
    ).toEqual(['message-baseline'])

    const restored = operations.createChat({ userId: 'user-bob', botId: 'bot-other' })
    operations.sendMessage({
      chatId: restored.id,
      sender: 'user',
      clientId: 'after-reset',
      content: { text: 'two' },
    })
    const next = database.sqlite
      .query("SELECT seq FROM sqlite_sequence WHERE name = 'bot_events'")
      .get() as { seq: number }
    expect(next.seq).toBeGreaterThan(previous.seq)
  })

  test('retains pending physical deletions after an I/O failure and retries them', async () => {
    await storage.write('local', 'file-retry', new Uint8Array([1]), 'application/octet-stream')
    database.db
      .insert(files)
      .values({
        id: 'file-retry',
        ownerType: 'user',
        ownerId: 'user-alice',
        chatId: 'chat-echo',
        originChatId: 'chat-echo',
        mime: 'application/octet-stream',
        size: 1,
        name: 'retry.bin',
        createdAt: Date.now(),
      })
      .run()
    let fail = true
    const flaky: MediaStorage = {
      ...storage,
      remove: async (...args) => {
        if (fail && args[2] !== true) throw new Error('temporary storage failure')
        return storage.remove(...args)
      },
    }
    operations = createTestFixtureOperations({ db: database.db, hub, baseline, storage: flaky })

    await expect(operations.flushChat('chat-echo')).rejects.toMatchObject({
      code: 'TEST_CLEANUP_INCOMPLETE',
    })
    expect(database.db.select().from(testFileDeletions).all()).toHaveLength(1)
    expect(
      database.db
        .select()
        .from(messages)
        .where(eq(messages.chatId, 'chat-echo'))
        .all()
        .map(({ id }) => id),
    ).toEqual(['message-baseline'])

    fail = false
    await operations.flushChat('chat-echo')
    expect(database.db.select().from(testFileDeletions).all()).toHaveLength(0)
    expect(await storage.blob('local', 'file-retry').exists()).toBe(false)
  })
})
