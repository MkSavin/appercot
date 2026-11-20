import type { Message } from '@appercot/protocol'
import type {
  AppercotTestClientOptions,
  BotFixture,
  ChatFixture,
  CreateBotInput,
  CreateChatInput,
  CreateUserInput,
  FetchImplementation,
  FixtureManifest,
  SendMessageInput,
  UserFixture,
} from './types.ts'

interface ControlErrorPayload {
  error?: {
    code?: unknown
    message?: unknown
    path?: unknown
  }
}

export class AppercotTestClientError extends Error {
  readonly status?: number
  readonly code: string
  readonly path?: string

  constructor(
    message: string,
    options: { status?: number; code: string; path?: string; cause?: unknown },
  ) {
    super(message, { cause: options.cause })
    this.name = 'AppercotTestClientError'
    this.status = options.status
    this.code = options.code
    this.path = options.path
  }
}

export class AppercotTestClient {
  private readonly endpoint: string
  private readonly token: string
  private readonly timeoutMs: number
  private readonly fetchImpl: FetchImplementation

  constructor(options: AppercotTestClientOptions) {
    if (!options.endpoint) throw new Error('Appercot test endpoint is required')
    if (!options.token) throw new Error('Appercot test token is required')
    const endpoint = new URL(options.endpoint)
    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
      throw new Error('Appercot test endpoint must use HTTP or HTTPS')
    }
    if (options.timeoutMs !== undefined && options.timeoutMs <= 0) {
      throw new Error('Appercot test timeout must be positive')
    }
    this.endpoint = options.endpoint.replace(/\/$/, '')
    this.token = options.token
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.fetchImpl = options.fetch ?? ((input, init) => globalThis.fetch(input, init))
  }

  async ready() {
    await this.request<unknown>('/ready')
  }

  fixtures() {
    return this.request<FixtureManifest>('/fixtures')
  }

  createUser(input: CreateUserInput) {
    return this.request<UserFixture>('/users', { method: 'POST', body: input })
  }

  createBot(input: CreateBotInput) {
    return this.request<BotFixture>('/bots', { method: 'POST', body: input })
  }

  createChat(input: CreateChatInput) {
    return this.request<ChatFixture>('/chats', { method: 'POST', body: input })
  }

  sendMessage(input: SendMessageInput) {
    return this.request<Message>('/messages', { method: 'POST', body: input })
  }

  async flushChat(id: string) {
    await this.request<unknown>(`/chats/${encodeURIComponent(id)}/flush`, {
      method: 'POST',
    })
  }

  async deleteChat(id: string) {
    await this.request<unknown>(`/chats/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  async flushUser(id: string) {
    await this.request<unknown>(`/users/${encodeURIComponent(id)}/flush`, {
      method: 'POST',
    })
  }

  async deleteUser(id: string) {
    await this.request<unknown>(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  async flushState() {
    await this.request<unknown>('/state/flush', { method: 'POST' })
  }

  private async request<Result>(
    path: string,
    init: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {},
  ): Promise<Result> {
    const controller = new AbortController()
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.timeoutMs)
    try {
      const response = await this.fetchImpl(`${this.endpoint}/_appercot/test${path}`, {
        method: init.method ?? 'GET',
        headers: {
          authorization: `Bearer ${this.token}`,
          ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      })
      const payload: unknown =
        response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok) {
        const controlError = (payload as ControlErrorPayload | null)?.error
        throw new AppercotTestClientError(
          typeof controlError?.message === 'string'
            ? controlError.message
            : `Control request failed with HTTP ${response.status}`,
          {
            status: response.status,
            code: typeof controlError?.code === 'string' ? controlError.code : 'TEST_HTTP_ERROR',
            ...(typeof controlError?.path === 'string' ? { path: controlError.path } : {}),
          },
        )
      }
      if (response.status !== 204 && payload === null) {
        throw new AppercotTestClientError('Control API returned invalid JSON', {
          status: response.status,
          code: 'TEST_INVALID_RESPONSE',
        })
      }
      return payload as Result
    } catch (error) {
      if (error instanceof AppercotTestClientError) throw error
      if (timedOut) {
        throw new AppercotTestClientError(`Control request timed out after ${this.timeoutMs}ms`, {
          code: 'TEST_TIMEOUT',
          cause: error,
        })
      }
      throw new AppercotTestClientError('Control request failed', {
        code: 'TEST_NETWORK_ERROR',
        cause: error,
      })
    } finally {
      clearTimeout(timeout)
    }
  }
}
