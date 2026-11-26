import { describe, expect, test } from 'bun:test'
import { ClientError } from 'graphql-request'
import {
  classifyOutboxError,
  outboxRetryDelay,
} from '../src/features/send-message/model/retry-policy'

const clientError = (status: number, code?: string, retryAfter?: string) =>
  new ClientError(
    {
      status,
      headers: new Headers(retryAfter ? { 'retry-after': retryAfter } : undefined),
      errors: [{ message: code ?? 'Request failed', ...(code ? { extensions: { code } } : {}) }],
    } as never,
    { query: 'mutation SendMessage', variables: {} },
  )

describe('outbox retry policy', () => {
  test('classifies permanent, unauthorized and transient failures', () => {
    expect(classifyOutboxError(clientError(200, 'FORBIDDEN')).kind).toBe('permanent')
    expect(classifyOutboxError(clientError(200, 'UNAUTHORIZED')).kind).toBe('unauthorized')
    expect(classifyOutboxError(clientError(503)).kind).toBe('transient')
    expect(classifyOutboxError(new TypeError('fetch failed')).kind).toBe('transient')
  })

  test('honors Retry-After and bounds exponential backoff with jitter', () => {
    const rateLimit = classifyOutboxError(clientError(200, 'RATE_LIMIT', '3'))
    expect(rateLimit).toEqual({ kind: 'transient', code: 'RATE_LIMIT', retryAfter: 3000 })
    expect(outboxRetryDelay(rateLimit, 2)).toBe(3000)

    const network = classifyOutboxError(new TypeError('fetch failed'))
    expect(outboxRetryDelay(network, 1, () => 0)).toBe(750)
    expect(outboxRetryDelay(network, 1, () => 1)).toBe(1250)
    expect(outboxRetryDelay(network, 20, () => 0.5)).toBe(60_000)
  })
})
