import { createHash, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { DomainError } from '../domain/errors'
import type { OperationBarrier } from './barrier'
import { TestFixtureError } from './errors'
import type { TestFixtureOperations } from './fixtures'

interface ControlOptions {
  token: string
  operations: TestFixtureOperations
  barrier: OperationBarrier
  isReady: () => boolean
}

const response = (status: number, body?: unknown) =>
  body === undefined
    ? new Response(null, { status, headers: { 'cache-control': 'no-store' } })
    : Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

const errorResponse = (status: number, code: string, message: string, path?: string) =>
  response(status, { error: { code, message, ...(path ? { path } : {}) } })

const authorized = (request: Request, token: string) => {
  const provided = request.headers.get('authorization')
  const value = provided?.startsWith('Bearer ') ? provided.slice(7) : ''
  const left = createHash('sha256').update(value).digest()
  const right = createHash('sha256').update(token).digest()
  return timingSafeEqual(left, right)
}

const domainStatus = (code: string) =>
  code === 'NOT_FOUND'
    ? 404
    : code === 'UNAUTHORIZED'
      ? 401
      : code === 'FORBIDDEN' || code === 'BOT_BLOCKED'
        ? 403
        : code === 'RATE_LIMIT'
          ? 429
          : code === 'BAD_REQUEST'
            ? 400
            : 500

export const createTestControlApi = ({ token, operations, barrier, isReady }: ControlOptions) => {
  const body = async (request: Request) => {
    try {
      return await request.json()
    } catch {
      throw new TestFixtureError(400, 'TEST_BAD_REQUEST', 'Expected a JSON request body')
    }
  }
  const reset = (operation: () => void | Promise<void>) =>
    barrier.runReset(async () => {
      await operation()
    })
  const mutateFixture = async <Input, Result>(
    request: Request,
    operation: (input: Input) => Result | Promise<Result>,
  ) => {
    const input = await body(request)
    return response(201, await barrier.run(() => operation(input)))
  }

  return async (request: Request): Promise<Response> => {
    if (!authorized(request, token))
      return errorResponse(401, 'TEST_UNAUTHORIZED', 'Invalid control token')
    const pathname = new URL(request.url).pathname
    try {
      if (pathname === '/_appercot/test/ready' && request.method === 'GET') {
        if (barrier.isResetting)
          return errorResponse(503, 'TEST_RESET_IN_PROGRESS', 'Test state reset is in progress')
        return isReady()
          ? response(200, { ok: true })
          : errorResponse(503, 'TEST_NOT_READY', 'Fixture seed is not complete')
      }
      if (pathname === '/_appercot/test/fixtures' && request.method === 'GET')
        return response(200, operations.fixtures())
      if (pathname === '/_appercot/test/users' && request.method === 'POST')
        return await mutateFixture(request, operations.createUser)
      if (pathname === '/_appercot/test/bots' && request.method === 'POST')
        return await mutateFixture(request, operations.createBot)
      if (pathname === '/_appercot/test/chats' && request.method === 'POST')
        return await mutateFixture(request, operations.createChat)
      if (pathname === '/_appercot/test/messages' && request.method === 'POST')
        return await mutateFixture(request, operations.sendMessage)
      if (pathname === '/_appercot/test/state/flush' && request.method === 'POST') {
        await reset(() => operations.flushState())
        return response(204)
      }
      const userFlush = /^\/_appercot\/test\/users\/([^/]+)\/flush$/.exec(pathname)
      if (userFlush?.[1] && request.method === 'POST') {
        const id = decodeURIComponent(userFlush[1])
        await reset(() => operations.flushUser(id))
        return response(204)
      }
      const userDelete = /^\/_appercot\/test\/users\/([^/]+)$/.exec(pathname)
      if (userDelete?.[1] && request.method === 'DELETE') {
        const id = decodeURIComponent(userDelete[1])
        await reset(() => operations.deleteUser(id))
        return response(204)
      }
      const chatFlush = /^\/_appercot\/test\/chats\/([^/]+)\/flush$/.exec(pathname)
      if (chatFlush?.[1] && request.method === 'POST') {
        const id = decodeURIComponent(chatFlush[1])
        await reset(() => operations.flushChat(id))
        return response(204)
      }
      const chatDelete = /^\/_appercot\/test\/chats\/([^/]+)$/.exec(pathname)
      if (chatDelete?.[1] && request.method === 'DELETE') {
        const id = decodeURIComponent(chatDelete[1])
        await reset(() => operations.deleteChat(id))
        return response(204)
      }
      return errorResponse(404, 'TEST_CONTROL_NOT_FOUND', 'Control route was not found')
    } catch (error) {
      if (error instanceof TestFixtureError)
        return errorResponse(error.status, error.code, error.message, error.path)
      if (error instanceof DomainError)
        return errorResponse(domainStatus(error.code), error.code, error.message)
      if (error instanceof z.ZodError) {
        const issue = error.issues[0]
        const path = issue?.path.length ? `/${issue.path.map(String).join('/')}` : undefined
        return errorResponse(400, 'TEST_VALIDATION_ERROR', issue?.message ?? 'Invalid input', path)
      }
      return errorResponse(500, 'TEST_INTERNAL_ERROR', 'Control operation failed')
    }
  }
}
