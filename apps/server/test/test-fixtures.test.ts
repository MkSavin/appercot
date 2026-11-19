import { describe, expect, test } from 'bun:test'
import { authenticateBotToken } from '../src/auth/bot-token'
import { loginUser } from '../src/auth/session'
import { createDatabase } from '../src/db/client'
import { botEvents, messages, userUpdates } from '../src/db/schema'
import { loadEnv } from '../src/env'
import { parseTestConfig } from '../src/test/config'
import { seedTestFixtures } from '../src/test/seed'

const config = () =>
  parseTestConfig({
    admin: { username: 'admin', password: 'admin-password' },
    users: [
      { id: 'user-alice', username: 'alice', displayName: 'Alice', password: 'alice-password' },
      { username: 'bob', displayName: 'Bob', password: 'bob-password' },
    ],
    bots: [
      {
        id: 'bot-echo',
        username: 'echo_bot',
        name: 'Echo',
        owner: 'alice',
        token: 'bot-echo:echo-secret',
        roles: [{ code: 'tester', name: 'Tester' }],
        defaultRoles: ['tester'],
        commands: [{ name: 'start', description: 'Start', shortcut: 'Alt+S', roles: ['tester'] }],
      },
      { username: 'generated_bot', name: 'Generated', owner: 'bob' },
    ],
    chats: [
      {
        id: 'chat-alice-echo',
        user: 'alice',
        bot: 'echo_bot',
        roles: ['tester'],
        messages: [
          {
            id: 'message-hello',
            sender: 'user',
            clientId: 'seed-hello',
            content: { text: 'Hello' },
          },
          {
            id: 'message-ready',
            sender: 'bot',
            content: {
              text: 'Ready',
              buttons: [[{ text: 'Start', command: '/start', shortcut: 'Alt+S' }]],
            },
          },
        ],
      },
    ],
    test: { token: 'control-secret' },
  })

describe('test fixture seed', () => {
  test('persists stable IDs and hashed credentials usable through normal authentication', async () => {
    const database = createDatabase(':memory:')
    try {
      const env = loadEnv({
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'admin-password',
        PUBLIC_URL: 'http://localhost',
      })
      const baseline = seedTestFixtures(database.db, env, config())
      const { manifest } = baseline

      expect(manifest.admin).toMatchObject({ username: 'admin', password: 'admin-password' })
      expect(manifest.users.map(({ id }) => id)).toEqual(['user-alice', expect.any(String)])
      expect(manifest.bots[0]).toMatchObject({
        id: 'bot-echo',
        ownerId: 'user-alice',
        token: 'bot-echo:echo-secret',
      })
      const generated = manifest.bots[1]
      if (!generated) throw new Error('Generated bot fixture is missing')
      expect(generated.id).toBeString()
      expect(generated.token.startsWith(`${generated.id}:`)).toBe(true)
      expect(manifest.chats[0]?.messages.map(({ id }) => id)).toEqual([
        'message-hello',
        'message-ready',
      ])

      const alice = await loginUser(database.db, {
        username: 'alice',
        password: 'alice-password',
      })
      expect(alice.user.id).toBe('user-alice')
      expect(authenticateBotToken(database.db, 'bot-echo:echo-secret')?.id).toBe('bot-echo')
      expect(authenticateBotToken(database.db, generated.token)?.id).toBe(generated.id)

      const stored = database.db.select().from(messages).all()
      expect(stored).toHaveLength(2)
      expect(stored.map(({ seq }) => seq)).toEqual([1, 2])
      expect(stored.every(({ status }) => status === 'processed')).toBe(true)
      expect(database.db.select().from(botEvents).all()).toHaveLength(0)
      expect(database.db.select().from(userUpdates).all()).toHaveLength(0)
    } finally {
      database.sqlite.close()
    }
  })

  test('returns immutable baseline DTOs with sequence and keyboard data', () => {
    const database = createDatabase(':memory:')
    try {
      const env = loadEnv({
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'admin-password',
        PUBLIC_URL: 'http://localhost',
      })
      const first = seedTestFixtures(database.db, env, config())
      const manifest = first.fixtures()
      const manifestUser = manifest.users[0]
      const manifestChat = manifest.chats[0]
      if (!manifestUser || !manifestChat) throw new Error('Baseline fixture is missing')
      manifestUser.displayName = 'Changed by caller'
      manifestChat.messages = []

      const restored = first.fixtures()
      expect(restored.users[0]?.displayName).toBe('Alice')
      expect(restored.chats[0]?.messages).toHaveLength(2)
      expect(restored.chats[0]?.messages[1]).toMatchObject({
        seq: 2,
        sender: 'bot',
        status: 'processed',
        content: { buttons: [[{ text: 'Start', command: '/start', shortcut: 'Alt+S' }]] },
      })
    } finally {
      database.sqlite.close()
    }
  })
})
