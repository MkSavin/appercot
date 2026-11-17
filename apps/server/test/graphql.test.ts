import { describe, expect, test } from 'bun:test'
import { createServerFixture, graphqlRequest } from './helpers'

describe('GraphQL', () => {
  test('registers, sets a session cookie and returns session', async () => {
    const fixture = createServerFixture()
    try {
      const registration = await graphqlRequest(
        fixture.baseUrl,
        `mutation Register($input: String!) {
          register(username: $input, password: "password123", displayName: "Alice", invite: "bootstrap-invite") {
            user { id username displayName isAdmin }
            chats { id }
            vapidPublicKey
          }
        }`,
        { input: 'alice' },
      )
      const cookie = registration.response.headers.get('set-cookie')

      expect(registration.body.errors).toBeUndefined()
      expect(cookie).toContain('sid=')
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('SameSite=Lax')

      const session = await graphqlRequest(
        fixture.baseUrl,
        'query { session { user { username isAdmin } chats { id } vapidPublicKey } }',
        {},
        cookie ?? undefined,
      )
      expect(session.body.errors).toBeUndefined()
      expect(session.body.data?.session).toMatchObject({
        user: { username: 'alice', isAdmin: false },
        chats: [],
        vapidPublicKey: null,
      })
    } finally {
      fixture.stop()
    }
  })

  test('rejects session without a cookie', async () => {
    const fixture = createServerFixture()
    try {
      const result = await graphqlRequest(fixture.baseUrl, 'query { session { user { id } } }')
      expect(result.body.errors?.[0]?.extensions?.code).toBe('UNAUTHORIZED')
    } finally {
      fixture.stop()
    }
  })
})
