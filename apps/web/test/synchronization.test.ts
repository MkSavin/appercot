import { describe, expect, test } from 'bun:test'
import type { ClientUpdate, Message } from '@appercot/protocol'
import { createChatStore, type SessionPayload } from '../src/entities/chat/model/store'
import { synchronizeChatState } from '../src/entities/chat/model/synchronize'

const session: SessionPayload = {
  user: { id: 'user-1', username: 'alice', displayName: 'Alice', isAdmin: false },
  chats: [
    {
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
      lastMessageAt: 1000,
      createdAt: 1,
    },
  ],
  vapidPublicKey: null,
}

const message: Message = {
  id: 'message-1',
  chatId: 'chat-1',
  seq: 1,
  sender: 'bot',
  content: { text: 'Recovered' },
  status: 'processed',
  createdAt: 1000,
}

describe('chat synchronization', () => {
  test('applies only new updates from the persisted checkpoint', async () => {
    const store = createChatStore()
    store.getState().setSession(session)
    store.getState().setLastSeq(4)
    const checkpoints: number[] = []
    const update: ClientUpdate = { type: 'bot.presence', botId: 'bot-1', online: false }

    await synchronizeChatState(store, {
      fetchUpdates: async (since) => {
        checkpoints.push(since)
        return { resetRequired: false, updates: [{ seq: 5, update }] }
      },
      refreshSession: async () => session,
      loadActiveChat: async () => [],
    })

    expect(checkpoints).toEqual([4])
    expect(store.getState().lastSeq).toBe(5)
    expect(store.getState().chats[0]?.bot.online).toBe(false)
  })

  test('reloads session and open history before restarting a reset synchronization', async () => {
    const store = createChatStore()
    store.getState().setSession(session)
    store.getState().setLastSeq(99)
    const checkpoints: number[] = []
    let historyLoads = 0

    await synchronizeChatState(store, {
      activeChatId: 'chat-1',
      fetchUpdates: async (since) => {
        checkpoints.push(since)
        if (since === 99) return { resetRequired: true, updates: [] }
        return {
          resetRequired: false,
          updates: [{ seq: 1, update: { type: 'message.new', message } }],
        }
      },
      refreshSession: async () => session,
      loadActiveChat: async (chatId) => {
        expect(chatId).toBe('chat-1')
        historyLoads += 1
        return [message]
      },
    })

    expect(checkpoints).toEqual([99, 0])
    expect(historyLoads).toBe(1)
    expect(store.getState().messagesByChat['chat-1']).toEqual([message])
    expect(store.getState().lastSeq).toBe(1)
  })
})
