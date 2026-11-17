import { describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { bootstrapAuth } from '../src/auth/password'
import { getSessionByToken, loginUser, logoutUser, registerUser } from '../src/auth/session'
import { createDatabase } from '../src/db/client'
import { users } from '../src/db/schema'
import { loadEnv } from '../src/env'

const createFixture = () => {
  const database = createDatabase(':memory:')
  const env = loadEnv({
    PUBLIC_URL: 'http://localhost',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'password123',
    BOOTSTRAP_INVITE: 'bootstrap-invite',
  })
  bootstrapAuth(database.db, env)
  return { ...database, env }
}

describe('authentication', () => {
  test('bootstraps the administrator only once', async () => {
    const fixture = createFixture()
    try {
      bootstrapAuth(fixture.db, fixture.env)
      const allUsers = fixture.db.select().from(users).all()
      const session = await loginUser(fixture.db, {
        username: 'admin',
        password: 'password123',
      })

      expect(allUsers).toHaveLength(1)
      expect(allUsers[0]?.isAdmin).toBe(true)
      expect(session.user.isAdmin).toBe(true)
    } finally {
      fixture.sqlite.close()
    }
  })

  test('registers by invite and exhausts its uses', async () => {
    const fixture = createFixture()
    try {
      const registration = await registerUser(fixture.db, fixture.env, {
        username: 'alice',
        password: 'password123',
        displayName: 'Alice',
        invite: 'bootstrap-invite',
      })

      expect(registration.user.username).toBe('alice')
      expect(registration.user.isAdmin).toBe(false)
      await expect(
        registerUser(fixture.db, fixture.env, {
          username: 'bob',
          password: 'password123',
          displayName: 'Bob',
          invite: 'bootstrap-invite',
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    } finally {
      fixture.sqlite.close()
    }
  })

  test('logs in, logs out and rejects expired sessions', async () => {
    const fixture = createFixture()
    try {
      const login = await loginUser(fixture.db, {
        username: 'admin',
        password: 'password123',
      })
      expect(getSessionByToken(fixture.db, login.token)?.user.username).toBe('admin')

      logoutUser(fixture.db, login.token)
      expect(getSessionByToken(fixture.db, login.token)).toBeNull()

      const expired = await loginUser(fixture.db, {
        username: 'admin',
        password: 'password123',
      })
      fixture.db
        .update((await import('../src/db/schema')).sessions)
        .set({ expiresAt: Date.now() - 1 })
        .where(eq((await import('../src/db/schema')).sessions.id, expired.sessionId))
        .run()
      expect(getSessionByToken(fixture.db, expired.token)).toBeNull()
    } finally {
      fixture.sqlite.close()
    }
  })
})
