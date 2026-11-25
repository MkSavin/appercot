import { describe, expect, test } from 'bun:test'
import { createBotWebSocketUrl } from '../src/domain/bot-connection'
import { createServerFixture, graphqlRequest } from './helpers'

describe('bot onboarding connection', () => {
  test('builds the SDK WebSocket URL from the public deployment URL', () => {
    expect(createBotWebSocketUrl('http://localhost:3000')).toBe('ws://localhost:3000/api/bot/ws')
    expect(createBotWebSocketUrl('https://example.test:8443/base/')).toBe(
      'wss://example.test:8443/api/bot/ws',
    )
    expect(createBotWebSocketUrl('http://127.0.0.1:3000/')).toBe('ws://127.0.0.1:3000/api/bot/ws')
    expect(() => createBotWebSocketUrl('ftp://example.test')).toThrow(TypeError)
  })

  test('returns the same WebSocket URL in session and login payloads', async () => {
    const fixture = createServerFixture(undefined, {
      PUBLIC_URL: 'https://example.test:8443/',
    })
    try {
      const login = await graphqlRequest(
        fixture.baseUrl,
        'mutation { login(username: "admin", password: "password123") { botWebSocketUrl } }',
      )
      expect(login.body.errors).toBeUndefined()
      expect(login.body.data.login).toEqual({
        botWebSocketUrl: 'wss://example.test:8443/api/bot/ws',
      })
      const cookie = login.response.headers.get('set-cookie')
      if (!cookie) throw new Error('Session cookie is missing')
      const session = await graphqlRequest(
        fixture.baseUrl,
        'query { session { botWebSocketUrl } }',
        {},
        cookie,
      )
      expect(session.body.data.session).toEqual({
        botWebSocketUrl: 'wss://example.test:8443/api/bot/ws',
      })
    } finally {
      fixture.stop()
    }
  })
})
