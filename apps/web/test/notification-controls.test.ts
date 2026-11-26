import { expect, test } from 'bun:test'
import type { ClientChat } from '@appercot/protocol'
import { createChatStore, type SessionPayload } from '../src/entities/chat'
import { updateChatNotifications } from '../src/features/chat-notifications'

const chat: ClientChat = {
  id: 'chat-1',
  bot: {
    id: 'bot-1',
    username: 'echobot',
    name: 'Echo',
    description: '',
    online: true,
    listed: true,
  },
  roles: [],
  blocked: false,
  unread: 0,
  lastMessageAt: null,
  createdAt: 1,
  notifications: 'all',
  notificationsMutedUntil: null,
}

const session = (userId: string): SessionPayload => ({
  user: { id: userId, username: userId, displayName: userId, role: 'user' },
  chats: [chat],
  vapidPublicKey: null,
  botWebSocketUrl: 'ws://localhost/api/bot/ws',
})

test('serializes notification changes and applies the authoritative response', async () => {
  const store = createChatStore()
  store.getState().setSession(session('user-1'))
  const modes: string[] = []
  const resolvers: Array<(chat: ClientChat) => void> = []
  const request = (_chatId: string, mode: 'all' | 'silent' | 'off') => {
    modes.push(mode)
    return new Promise<ClientChat>((resolve) => resolvers.push(resolve))
  }
  const first = updateChatNotifications(store, chat.id, 'silent', request)
  const second = updateChatNotifications(store, chat.id, 'off', request)
  await Bun.sleep(0)
  expect(modes).toEqual(['silent'])
  resolvers[0]?.({ ...chat, notifications: 'silent' })
  await Bun.sleep(0)
  expect(modes).toEqual(['silent', 'off'])
  resolvers[1]?.({ ...chat, notifications: 'off' })
  await Promise.all([first, second])
  expect(store.getState().chats[0]?.notifications).toBe('off')
})

// @anchor INV:notification-controls/isolates-accounts
test('drops a late notification response after an account switch', async () => {
  const store = createChatStore()
  store.getState().setSession(session('user-1'))
  let resolveRequest: ((chat: ClientChat) => void) | undefined
  const pending = updateChatNotifications(store, chat.id, 'silent', () =>
    Promise.resolve(
      new Promise<ClientChat>((resolve) => {
        resolveRequest = resolve
      }),
    ),
  )
  await Bun.sleep(0)
  store.getState().setSession(session('user-2'))
  resolveRequest?.({ ...chat, notifications: 'silent' })
  await pending
  expect(store.getState().chats[0]?.notifications).toBe('all')
})
