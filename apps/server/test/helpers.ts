import { bootstrapAuth } from '../src/auth/password'
import { createDatabase } from '../src/db/client'
import { loadEnv } from '../src/env'
import { startServer } from '../src/index'

export const createServerFixture = () => {
  const database = createDatabase(':memory:')
  const env = loadEnv({
    PUBLIC_URL: 'http://localhost',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'password123',
    BOOTSTRAP_INVITE: 'bootstrap-invite',
  })
  bootstrapAuth(database.db, env)
  const server = startServer({ database, env, port: 0 })
  const baseUrl = `http://127.0.0.1:${server.port}`

  return {
    ...database,
    env,
    server,
    baseUrl,
    stop: () => {
      server.stop()
      setTimeout(() => database.sqlite.close(), 20)
    },
  }
}

export const graphqlRequest = async (
  baseUrl: string,
  query: string,
  variables: Record<string, unknown> = {},
  cookie?: string,
) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (cookie) headers.set('cookie', cookie)
  const response = await fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })
  const body = (await response.json()) as {
    data?: Record<string, unknown>
    errors?: Array<{ message: string; extensions?: { code?: string } }>
  }
  return { response, body }
}

type BotFrame = {
  t: string
  id?: string
  seq?: number
  [key: string]: unknown
}

export class BotTestClient {
  readonly socket: WebSocket
  private readonly frames: BotFrame[] = []
  private readonly waiters: Array<(frame: BotFrame) => void> = []

  constructor(url: string) {
    this.socket = new WebSocket(url)
    this.socket.addEventListener('message', (event) => {
      const frame = JSON.parse(String(event.data)) as BotFrame
      const waiter = this.waiters.shift()
      if (waiter) waiter(frame)
      else this.frames.push(frame)
    })
  }

  async next(): Promise<BotFrame> {
    const frame = this.frames.shift()
    if (frame) return frame
    return Promise.race([
      new Promise<BotFrame>((resolve) => this.waiters.push(resolve)),
      new Promise<BotFrame>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for a bot frame')), 3000),
      ),
    ])
  }

  async call(id: string, method: string, params: unknown) {
    this.socket.send(JSON.stringify({ t: 'req', id, method, params }))
    for (;;) {
      const frame = await this.next()
      if (frame.t === 'res' && frame.id === id) return frame
    }
  }
}

export const connectBot = async (baseUrl: string, token: string) => {
  const url = `${baseUrl.replace('http:', 'ws:')}/api/bot/ws?token=${encodeURIComponent(token)}`
  const client = new BotTestClient(url)
  await Promise.race([
    new Promise<void>((resolve, reject) => {
      client.socket.addEventListener('open', () => resolve(), { once: true })
      client.socket.addEventListener('error', () => reject(new Error('WebSocket failed')), {
        once: true,
      })
    }),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Timed out opening WebSocket')), 3000),
    ),
  ])
  return client
}

export const waitFor = async (condition: () => boolean) => {
  const deadline = Date.now() + 3000
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Condition was not met')
    await Bun.sleep(10)
  }
}
