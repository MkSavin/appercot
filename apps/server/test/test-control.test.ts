import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { AppercotTestClient } from '../../../packages/test/src/index'
import { createDatabase, type DatabaseContext } from '../src/db/client'
import { createMediaStorage } from '../src/domain/media-storage'
import { loadEnv } from '../src/env'
import { startServer } from '../src/index'
import { OperationBarrier } from '../src/test/barrier'
import { parseTestConfig } from '../src/test/config'
import { createTestControlApi } from '../src/test/control'
import { createTestFixtureOperations } from '../src/test/fixtures'
import { seedTestFixtures } from '../src/test/seed'
import { Hub } from '../src/ws/hub'

const config = parseTestConfig({
  users: [
    { id: 'user-alice', username: 'alice', displayName: 'Alice', password: 'alice-password' },
  ],
  bots: [
    {
      id: 'bot-echo',
      username: 'echo_bot',
      name: 'Echo',
      owner: 'alice',
      token: 'bot-echo:secret',
    },
  ],
  chats: [{ id: 'chat-echo', user: 'alice', bot: 'echo_bot', messages: [] }],
  test: { token: 'control-secret' },
})

describe('test control API', () => {
  let database: DatabaseContext
  let server: ReturnType<typeof startServer>
  let client: AppercotTestClient
  let seeded: boolean
  let barrier: OperationBarrier

  beforeEach(() => {
    database = createDatabase(':memory:')
    const env = loadEnv({ DATA_DIR: ':memory:', PUBLIC_URL: 'http://localhost', NODE_ENV: 'test' })
    const hub = new Hub()
    const baseline = seedTestFixtures(database.db, env, config)
    const operations = createTestFixtureOperations({
      db: database.db,
      hub,
      baseline,
      storage: createMediaStorage(env),
    })
    seeded = true
    barrier = new OperationBarrier()
    server = startServer({
      database,
      env,
      hostname: '127.0.0.1',
      port: 0,
      testControl: createTestControlApi({
        token: 'control-secret',
        operations,
        barrier,
        isReady: () => seeded,
      }),
      barrier,
    })
    client = new AppercotTestClient({
      endpoint: `http://127.0.0.1:${server.port}`,
      token: 'control-secret',
    })
  })

  afterEach(() => {
    server.stop()
    database.sqlite.close()
  })

  test('requires bearer authentication and no-store on every route including ready', async () => {
    for (const authorization of [undefined, 'Bearer wrong-secret']) {
      const response = await fetch(`http://127.0.0.1:${server.port}/_appercot/test/ready`, {
        headers: authorization ? { authorization } : {},
      })
      expect(response.status).toBe(401)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.json()).toMatchObject({ error: { code: 'TEST_UNAUTHORIZED' } })
    }

    seeded = false
    const pending = await fetch(`http://127.0.0.1:${server.port}/_appercot/test/ready`, {
      headers: { authorization: 'Bearer control-secret' },
    })
    expect(pending.status).toBe(503)
    expect(await pending.json()).toMatchObject({ error: { code: 'TEST_NOT_READY' } })
    seeded = true
    await client.ready()
  })

  test('serves the fixture manifest and every public client operation', async () => {
    expect((await client.fixtures()).chats[0]?.id).toBe('chat-echo')
    const user = await client.createUser({
      username: 'runtime',
      displayName: 'Runtime',
      password: 'runtime-password',
    })
    const bot = await client.createBot({
      username: 'runtime_bot',
      name: 'Runtime',
      ownerId: user.id,
    })
    const chat = await client.createChat({ userId: user.id, botId: bot.id })
    const message = await client.sendMessage({
      chatId: chat.id,
      sender: 'user',
      clientId: 'control-1',
      content: { text: 'hello' },
    })
    expect(message.chatId).toBe(chat.id)

    await client.flushChat(chat.id)
    await client.deleteChat(chat.id)
    await client.flushUser(user.id)
    await client.deleteUser(user.id)
    await client.flushState()
    expect((await client.fixtures()).users[0]?.id).toBe('user-alice')
  })

  test('rejects new state requests and WebSocket upgrades while reset is paused', async () => {
    let release!: () => void
    const resetting = barrier.runReset(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    for (const path of ['/graphql', '/api/ws', '/api/bot/ws']) {
      const response = await fetch(`http://127.0.0.1:${server.port}${path}`, {
        method: path === '/graphql' ? 'POST' : 'GET',
      })
      expect(response.status).toBe(503)
      expect(await response.json()).toMatchObject({ error: { code: 'TEST_RESET_IN_PROGRESS' } })
    }
    release()
    await resetting
  })

  test('maps missing fixtures and unknown control paths to machine-readable errors', async () => {
    await expect(client.deleteChat('missing')).rejects.toMatchObject({
      status: 404,
      code: 'TEST_FIXTURE_NOT_FOUND',
    })
    const response = await fetch(`http://127.0.0.1:${server.port}/_appercot/test/unknown`, {
      headers: { authorization: 'Bearer control-secret' },
    })
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ error: { code: 'TEST_CONTROL_NOT_FOUND' } })
  })
})

describe('production control route isolation', () => {
  test('returns 404 before SPA fallback even with NODE_ENV=test', async () => {
    const database = createDatabase(':memory:')
    const env = loadEnv({ PUBLIC_URL: 'http://localhost', NODE_ENV: 'test' })
    const server = startServer({ database, env, hostname: '127.0.0.1', port: 0 })
    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/_appercot/test/ready`, {
        headers: { authorization: 'Bearer control-secret' },
      })
      expect(response.status).toBe(404)
    } finally {
      server.stop()
      database.sqlite.close()
    }
  })
})
