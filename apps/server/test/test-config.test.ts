/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: Tests cover literal placeholder syntax. */
import { describe, expect, test } from 'bun:test'
import {
  expandPlaceholders,
  parseServerConfig,
  parseTestConfig,
  resolveTestConfig,
} from '../src/test/config'

const minimal = { test: { token: 'control-secret' } }

describe('test configuration placeholders', () => {
  test('expands every supported form only in JSON strings', () => {
    const value = {
      $literal: '\\$NOT_A_VALUE',
      simple: '$NAME',
      braced: '${NAME}',
      fallback: '${MISSING:-fallback}',
      emptyFallback: '${EMPTY:-fallback}',
      emptyPresent: '${EMPTY}',
      escaped: '\\$NAME',
      nested: ['${NAME}', { value: '$NAME' }],
      number: 4,
    }
    expect(expandPlaceholders(value, { NAME: 'expanded', EMPTY: '', MISSING: undefined })).toEqual({
      $literal: '$NOT_A_VALUE',
      simple: 'expanded',
      braced: 'expanded',
      fallback: 'fallback',
      emptyFallback: 'fallback',
      emptyPresent: '',
      escaped: '$NAME',
      nested: ['expanded', { value: 'expanded' }],
      number: 4,
    })
  })

  test('reports a required variable and exact JSON path without exposing secrets', () => {
    expect(() =>
      expandPlaceholders(
        { admin: { password: 'top-secret-value' }, users: [{ password: '${ALICE_PASSWORD}' }] },
        { ALICE_PASSWORD: undefined },
      ),
    ).toThrow(/users\[0\]\.password.*ALICE_PASSWORD|ALICE_PASSWORD.*users\[0\]\.password/)
    try {
      expandPlaceholders({ users: [{ password: '${ALICE_PASSWORD}' }] }, {})
    } catch (error) {
      expect(String(error)).not.toContain('top-secret-value')
      expect(String(error)).not.toContain('${ALICE_PASSWORD}')
    }
  })
})

describe('test configuration schema', () => {
  test('production configuration rejects fixture and test-only sections', () => {
    expect(() => parseServerConfig({ users: [] })).toThrow(/users/)
    expect(() => parseServerConfig({ bots: [] })).toThrow(/bots/)
    expect(() => parseServerConfig({ chats: [] })).toThrow(/chats/)
    expect(() => parseServerConfig({ test: { token: 'secret' } })).toThrow(/test/)
    expect(parseServerConfig({ registration: { enabled: true } })).toEqual({
      registration: { enabled: true },
    })
  })

  test('rejects unknown fields with their JSON path', () => {
    expect(() => parseTestConfig({ ...minimal, users: [{ unexpected: true }] })).toThrow(
      /users\[0\]/,
    )
    expect(() => parseTestConfig({ ...minimal, productionOnly: true })).toThrow(/productionOnly/)
  })

  test('validates duplicates, references and administrator duplication', () => {
    const user = { username: 'alice', displayName: 'Alice', password: 'password123' }
    expect(() =>
      parseTestConfig({
        ...minimal,
        admin: { username: 'alice', password: 'password123' },
        users: [user],
      }),
    ).toThrow(/users\[0\]\.username/)
    expect(() => parseTestConfig({ ...minimal, users: [user, user] })).toThrow(
      /users\[1\]\.username/,
    )
    expect(() =>
      parseTestConfig({
        ...minimal,
        chats: [{ user: 'alice', bot: 'missing_bot', messages: [] }],
      }),
    ).toThrow(/chats\[0\]\.user/)
  })

  test('validates bot token prefixes and sender-specific baseline content', () => {
    expect(() =>
      parseTestConfig({
        ...minimal,
        bots: [
          {
            id: 'bot-explicit',
            username: 'echo_bot',
            name: 'Echo',
            owner: 'alice',
            token: 'other:secret',
          },
        ],
        users: [{ username: 'alice', displayName: 'Alice', password: 'password123' }],
      }),
    ).toThrow(/bots\[0\]\.token/)
    expect(() =>
      parseTestConfig({
        ...minimal,
        users: [{ username: 'alice', displayName: 'Alice', password: 'password123' }],
        bots: [{ username: 'echo_bot', name: 'Echo', owner: 'alice' }],
        chats: [
          {
            user: 'alice',
            bot: 'echo_bot',
            messages: [
              {
                sender: 'user',
                content: { text: 'hello', buttons: [[{ text: 'bad', callback: 'bad' }]] },
              },
            ],
          },
        ],
      }),
    ).toThrow(/chats\[0\]\.messages\[0\]\.content/)
  })

  test('accepts commands, roles and bot keyboards using shared schemas', () => {
    const config = parseTestConfig({
      ...minimal,
      users: [{ username: 'alice', displayName: 'Alice', password: 'password123' }],
      bots: [
        {
          id: 'bot-echo',
          username: 'echo_bot',
          name: 'Echo',
          owner: 'alice',
          token: 'bot-echo:secret',
          roles: [{ code: 'tester', name: 'Tester' }],
          defaultRoles: ['tester'],
          commands: [{ name: 'start', description: 'Start', shortcut: 'Alt+S', roles: ['tester'] }],
        },
      ],
      chats: [
        {
          id: 'chat-echo',
          user: 'alice',
          bot: 'echo_bot',
          messages: [
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
    })
    expect(config.bots[0]?.commands).toHaveLength(1)
    expect(config.chats[0]?.messages[0]?.id).toBe('message-ready')
  })

  test('uses defaults, then JSON, then existing environment variables', () => {
    const config = parseTestConfig({
      server: { hostname: '127.0.0.1', port: 3100, dataDir: '.test-data/bots' },
      registration: { enabled: false, userInvites: false },
      ...minimal,
    })
    const resolved = resolveTestConfig(config, { PORT: '3200', ALLOW_REGISTRATION: 'true' })
    expect(resolved.hostname).toBe('127.0.0.1')
    expect(resolved.env.PORT).toBe(3200)
    expect(resolved.env.DATA_DIR).toBe('.test-data/bots')
    expect(resolved.env.ALLOW_REGISTRATION).toBe(true)
    expect(resolved.env.ALLOW_USER_INVITES).toBe(false)
    expect(resolved.env.S3_BUCKET).toBe('appercot')
  })

  test('retains AppEnv media, S3 and push validation', () => {
    expect(() =>
      resolveTestConfig(
        parseTestConfig({ ...minimal, s3: { endpoint: 'https://s3.example.test' } }),
        {},
      ),
    ).toThrow(/S3_ACCESS_KEY_ID/)
    expect(() =>
      resolveTestConfig(parseTestConfig({ ...minimal, vapid: { publicKey: 'public-only' } }), {}),
    ).toThrow(/vapid\.privateKey|VAPID_PRIVATE_KEY/)
    expect(() =>
      resolveTestConfig(parseTestConfig({ ...minimal, media: { uploadsPerActor: 0 } }), {}),
    ).toThrow(/media\.uploadsPerActor/)
  })
})
