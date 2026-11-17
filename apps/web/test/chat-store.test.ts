import { describe, expect, test } from 'bun:test'
import type { ClientChat, Message, UserRef } from '@appercot/protocol'
import { createChatStore, type SessionPayload } from '../src/entities/chat/model/store'

const user: SessionPayload['user'] = {
  id: 'user-1',
  username: 'alice',
  displayName: 'Alice',
  isAdmin: false,
}

const bot: ClientChat['bot'] = {
  id: 'bot-1',
  username: 'echobot',
  name: 'Echo',
  description: 'Echo bot',
  online: true,
  listed: true,
}

const chat: ClientChat = {
  id: 'chat-1',
  bot,
  roles: [],
  blocked: false,
  unread: 0,
  lastMessageAt: null,
  createdAt: 100,
}

const session: SessionPayload = { user, chats: [chat], vapidPublicKey: null }

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 'message-1',
  chatId: chat.id,
  seq: 1,
  sender: 'user',
  content: { text: 'Hello' },
  status: 'accepted',
  createdAt: 1000,
  ...overrides,
})

const lastMessage = (store: ReturnType<typeof createChatStore>) =>
  store.getState().messagesByChat[chat.id]?.at(-1)

describe('chat store', () => {
  test('moves an optimistic message through accepted and processed without duplicates', () => {
    const store = createChatStore()
    store.getState().setSession(session)
    store.getState().beginOptimisticMessage(chat.id, 'client-1', { text: 'Hello' }, 1000)

    expect(lastMessage(store)).toMatchObject({
      id: 'pending:client-1',
      clientId: 'client-1',
      status: 'pending',
    })
    expect(store.getState().pendingByChat[chat.id]).toEqual(['client-1'])

    expect(store.getState().applyUpdate(1, { type: 'message.new', message: message() })).toBe(true)
    expect(store.getState().messagesByChat[chat.id]).toHaveLength(1)
    expect(lastMessage(store)).toMatchObject({ id: 'message-1', status: 'accepted' })
    expect(store.getState().pendingByChat[chat.id]).toEqual([])

    store.getState().applyUpdate(2, {
      type: 'message.status',
      chatId: chat.id,
      messageId: 'message-1',
      status: 'processed',
    })
    store.getState().applyUpdate(3, {
      type: 'message.status',
      chatId: chat.id,
      messageId: 'message-1',
      status: 'accepted',
    })

    expect(lastMessage(store)?.status).toBe('processed')
    expect(store.getState().applyUpdate(3, { type: 'chat.cleared', chatId: chat.id })).toBe(false)
    expect(lastMessage(store)?.status).toBe('processed')
    expect(store.getState().lastSeq).toBe(3)
  })

  test('keeps the same client id when a failed message is retried', () => {
    const store = createChatStore()
    store.getState().setSession(session)
    store.getState().beginOptimisticMessage(chat.id, 'client-retry', { text: 'Again' }, 1000)
    store.getState().failOutgoingMessage(chat.id, 'client-retry')

    expect(lastMessage(store)?.status).toBe('failed')

    store.getState().retryOutgoingMessage(chat.id, 'client-retry')
    expect(lastMessage(store)).toMatchObject({ clientId: 'client-retry', status: 'pending' })

    store
      .getState()
      .completeOutgoingMessage(chat.id, 'client-retry', message({ id: 'server-message' }))
    expect(store.getState().messagesByChat[chat.id]).toHaveLength(1)
    expect(lastMessage(store)).toMatchObject({ id: 'server-message', status: 'accepted' })
  })

  test('preserves pending messages when history is replaced or prepended', () => {
    const store = createChatStore()
    store.getState().setSession(session)
    store.getState().replaceMessages(chat.id, [message({ id: 'newest', seq: 2 })])
    store.getState().beginOptimisticMessage(chat.id, 'pending-1', { text: 'Pending' }, 2000)
    store.getState().prependMessages(chat.id, [message({ id: 'oldest', seq: 1 })])
    store.getState().replaceMessages(chat.id, [message({ id: 'newest', seq: 2 })])

    expect(store.getState().messagesByChat[chat.id]?.map((item) => item.id)).toEqual([
      'newest',
      'pending:pending-1',
    ])
    expect(store.getState().pendingByChat[chat.id]).toEqual(['pending-1'])
  })

  test('stores the synchronization checkpoint separately for each user', () => {
    const values = new Map<string, string>([['appercot:last-seq:user-1', '7']])
    const storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    }
    const store = createChatStore({ checkpointStorage: storage })
    store.getState().setSession(session)

    expect(store.getState().lastSeq).toBe(7)

    store.getState().applyUpdate(8, { type: 'bot.presence', botId: bot.id, online: false })
    expect(values.get('appercot:last-seq:user-1')).toBe('8')
    expect(store.getState().chats[0]?.bot.online).toBe(false)

    const otherUser: UserRef & { isAdmin: boolean } = { ...user, id: 'user-2' }
    store.getState().setSession({ ...session, user: otherUser })
    expect(store.getState().lastSeq).toBe(0)
  })
})
