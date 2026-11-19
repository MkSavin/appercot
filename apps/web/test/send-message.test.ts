import '../src/shared/config/i18n'
import { describe, expect, test } from 'bun:test'
import type { Message } from '@appercot/protocol'
import { createChatStore, type SessionPayload } from '../src/entities/chat/model/store'
import {
  retryChatMessage,
  type SendMessageRequest,
  sendChatMessage,
} from '../src/features/send-message/model/send-message'

const session: SessionPayload = {
  user: { id: 'user-1', username: 'alice', displayName: 'Alice', role: 'user' },
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
      lastMessageAt: null,
      createdAt: 1,
    },
  ],
  vapidPublicKey: null,
}

const acceptedMessage: Message = {
  id: 'message-1',
  chatId: 'chat-1',
  seq: 1,
  sender: 'user',
  content: { text: 'Hello' },
  status: 'accepted',
  createdAt: 1000,
}

describe('send message', () => {
  test('resolves the optimistic message with the server response', async () => {
    const store = createChatStore()
    store.getState().setSession(session)
    const request: SendMessageRequest = async (input) => ({
      ...acceptedMessage,
      content: input.content,
    })

    await sendChatMessage(store, { chatId: 'chat-1', content: { text: 'Hello' } }, request, {
      clientId: 'client-1',
      now: () => 1000,
    })

    expect(store.getState().messagesByChat['chat-1']).toEqual([acceptedMessage])
    expect(store.getState().pendingByChat['chat-1']).toEqual([])
  })

  // @anchor INV:send-message/reuses-id
  test('marks a failed send and retries with the identical client id', async () => {
    const store = createChatStore()
    store.getState().setSession(session)
    const clientIds: string[] = []
    const failingRequest: SendMessageRequest = async (input) => {
      clientIds.push(input.clientId)
      throw new Error('Network unavailable')
    }

    await expect(
      sendChatMessage(store, { chatId: 'chat-1', content: { text: 'Hello' } }, failingRequest, {
        clientId: 'client-retry',
        now: () => 1000,
      }),
    ).rejects.toThrow('Network unavailable')
    expect(store.getState().messagesByChat['chat-1']?.[0]?.status).toBe('failed')

    const retryRequest: SendMessageRequest = async (input) => {
      clientIds.push(input.clientId)
      return { ...acceptedMessage, content: input.content }
    }
    await retryChatMessage(store, 'chat-1', 'client-retry', retryRequest)

    expect(clientIds).toEqual(['client-retry', 'client-retry'])
    expect(store.getState().messagesByChat['chat-1']?.[0]?.status).toBe('accepted')
  })
})
