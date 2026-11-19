import { describe, expect, test } from 'bun:test'
import { AppercotTestClient, AppercotTestServerError } from '../src/index'
import type { FetchImplementation } from '../src/types'

const json = (value: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const options = (fetchImpl: FetchImplementation, timeoutMs = 1000) => ({
  endpoint: 'http://127.0.0.1:3100/',
  token: 'control-secret',
  timeoutMs,
  fetch: fetchImpl,
})

describe('AppercotTestClient', () => {
  test('authorizes readiness and fixture manifest requests', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const manifest = { admin: null, users: [], bots: [], chats: [] }
    const client = new AppercotTestClient(
      options(async (url, init) => {
        calls.push({ url: String(url), init })
        return json(calls.length === 1 ? { ok: true } : manifest)
      }),
    )

    await client.ready()
    expect(await client.fixtures()).toEqual(manifest)
    expect(calls.map(({ url }) => url)).toEqual([
      'http://127.0.0.1:3100/_appercot/test/ready',
      'http://127.0.0.1:3100/_appercot/test/fixtures',
    ])
    for (const call of calls) {
      expect(new Headers(call.init?.headers).get('authorization')).toBe('Bearer control-secret')
      expect(call.init?.method).toBe('GET')
    }
  })

  test('creates typed fixtures and sends messages through control paths', async () => {
    const calls: Array<{ url: string; body: unknown }> = []
    const client = new AppercotTestClient(
      options(async (url, init) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined
        calls.push({ url: String(url), body })
        if (String(url).endsWith('/users'))
          return json(
            { id: 'user-1', username: 'alice', displayName: 'Alice', password: 'password123' },
            201,
          )
        if (String(url).endsWith('/bots'))
          return json(
            {
              id: 'bot-1',
              username: 'echo_bot',
              name: 'Echo',
              ownerId: 'user-1',
              token: 'bot-1:secret',
            },
            201,
          )
        if (String(url).endsWith('/chats'))
          return json({ id: 'chat-1', userId: 'user-1', botId: 'bot-1' }, 201)
        return json(
          { id: 'message-1', chatId: 'chat-1', sender: 'user', content: { text: 'hello' } },
          201,
        )
      }),
    )

    await client.createUser({ username: 'alice', displayName: 'Alice', password: 'password123' })
    await client.createBot({ username: 'echo_bot', name: 'Echo', ownerId: 'user-1' })
    await client.createChat({ userId: 'user-1', botId: 'bot-1' })
    await client.sendMessage({
      chatId: 'chat-1',
      sender: 'user',
      clientId: 'hello-1',
      content: { text: 'hello' },
    })

    expect(calls.map(({ url }) => new URL(url).pathname)).toEqual([
      '/_appercot/test/users',
      '/_appercot/test/bots',
      '/_appercot/test/chats',
      '/_appercot/test/messages',
    ])
    expect(calls.at(-1)?.body).toEqual({
      chatId: 'chat-1',
      sender: 'user',
      clientId: 'hello-1',
      content: { text: 'hello' },
    })
  })

  test('maps every cleanup operation and accepts empty responses', async () => {
    const calls: Array<{ method?: string; pathname: string }> = []
    const client = new AppercotTestClient(
      options(async (url, init) => {
        calls.push({ method: init?.method, pathname: new URL(String(url)).pathname })
        return json(null, 204)
      }),
    )

    await client.flushChat('chat/1')
    await client.deleteChat('chat/1')
    await client.flushUser('user 1')
    await client.deleteUser('user 1')
    await client.flushState()

    expect(calls).toEqual([
      { method: 'POST', pathname: '/_appercot/test/chats/chat%2F1/flush' },
      { method: 'DELETE', pathname: '/_appercot/test/chats/chat%2F1' },
      { method: 'POST', pathname: '/_appercot/test/users/user%201/flush' },
      { method: 'DELETE', pathname: '/_appercot/test/users/user%201' },
      { method: 'POST', pathname: '/_appercot/test/state/flush' },
    ])
  })

  test('maps HTTP validation errors with status, code and path', async () => {
    const client = new AppercotTestClient(
      options(async () =>
        json(
          {
            error: {
              code: 'TEST_FIXTURE_CONFLICT',
              message: 'Conflicting roles',
              path: '/chats/0',
            },
          },
          409,
        ),
      ),
    )

    const error = await client.flushChat('chat-1').catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(AppercotTestServerError)
    expect(error).toMatchObject({
      status: 409,
      code: 'TEST_FIXTURE_CONFLICT',
      message: 'Conflicting roles',
      path: '/chats/0',
    })
  })

  test('uses its own error code for network failures without an HTTP status', async () => {
    const client = new AppercotTestClient(
      options(async () => {
        throw new TypeError('connection refused')
      }),
    )
    const error = await client.ready().catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(AppercotTestServerError)
    expect(error).toMatchObject({ code: 'TEST_NETWORK_ERROR', status: undefined })
  })

  test('aborts requests at the configured timeout', async () => {
    const captured: { signal?: AbortSignal } = {}
    const client = new AppercotTestClient(
      options(async (_url, init) => {
        captured.signal = init?.signal ?? undefined
        return await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            {
              once: true,
            },
          )
        })
      }, 5),
    )

    const error = await client.ready().catch((cause: unknown) => cause)
    expect(error).toMatchObject({ code: 'TEST_TIMEOUT', status: undefined })
    expect(captured.signal?.aborted).toBe(true)
  })

  test('requires endpoint and token explicitly', () => {
    expect(() => new AppercotTestClient({ endpoint: '', token: 'secret' })).toThrow('endpoint')
    expect(() => new AppercotTestClient({ endpoint: 'http://localhost', token: '' })).toThrow(
      'token',
    )
  })
})
