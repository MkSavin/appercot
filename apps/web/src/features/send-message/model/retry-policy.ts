import { ClientError } from 'graphql-request'
import { getRequestErrorCode } from '@/shared/api'

export type OutboxFailure = {
  kind: 'transient' | 'permanent' | 'unauthorized'
  code: string
  retryAfter?: number
}

const permanentCodes = new Set([
  'BAD_REQUEST',
  'FORBIDDEN',
  'NOT_FOUND',
  'BOT_BLOCKED',
  'KV_QUOTA',
  'MEDIA_TOO_LARGE',
])

const retryAfterMilliseconds = (error: ClientError, now: number) => {
  const value = error.response.headers?.get('retry-after')
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined
}

export const classifyOutboxError = (error: unknown, now = Date.now()): OutboxFailure => {
  const errorCode = getRequestErrorCode(error)
  const code = typeof errorCode === 'string' ? errorCode : undefined
  if (code === 'UNAUTHORIZED') return { kind: 'unauthorized', code }
  if (code === 'RATE_LIMIT') {
    const retryAfter = error instanceof ClientError ? retryAfterMilliseconds(error, now) : undefined
    return { kind: 'transient', code, retryAfter }
  }
  if (typeof code === 'string' && permanentCodes.has(code)) return { kind: 'permanent', code }
  if (error instanceof ClientError) {
    const status = error.response.status
    if (status === 408 || status === 429 || status >= 500) {
      return {
        kind: 'transient',
        code: code ?? `HTTP_${status}`,
        retryAfter: retryAfterMilliseconds(error, now),
      }
    }
    if (status >= 400 && status < 500) {
      return { kind: 'permanent', code: code ?? `HTTP_${status}` }
    }
  }
  return { kind: 'transient', code: code ?? 'NETWORK' }
}

export const outboxRetryDelay = (
  failure: OutboxFailure,
  attempts: number,
  random = Math.random,
) => {
  if (failure.retryAfter !== undefined) return failure.retryAfter
  const exponential = Math.min(60_000, 1000 * 2 ** Math.min(Math.max(attempts - 1, 0), 6))
  return Math.round(exponential * (0.75 + random() * 0.5))
}
