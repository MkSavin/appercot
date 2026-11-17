import { describe, expect, expectTypeOf, test } from 'bun:test'
import { type BotEventListener, BotEventSchema, MessageSchema } from '../src'

const user = { id: 'user-1', username: 'alice', displayName: 'Alice' }
const chat = { id: 'chat-1', roles: ['admin'], blocked: false, createdAt: 1 }
const message = {
  id: 'message-1',
  chatId: chat.id,
  seq: 1,
  sender: 'user',
  content: { text: '/start' },
  status: 'accepted',
  createdAt: 2,
}

describe('bot events', () => {
  test('parses every event with its session context', () => {
    const events = [
      { type: 'chat_started', chat, user },
      { type: 'message', chat, user, message: { ...message, content: { text: 'Hello' } } },
      { type: 'command', chat, user, message, name: 'start' },
      { type: 'callback', chat, user, messageId: message.id, data: 'action:1', callbackId: 'cb-1' },
      { type: 'chat_updated', chat, user },
      { type: 'bot_blocked', chat, user },
      { type: 'bot_unblocked', chat, user },
      { type: 'chat_cleared', chat, user },
    ]

    for (const event of events) {
      expect(BotEventSchema.safeParse(event).success).toBe(true)
    }
  })

  test('rejects an event without a user', () => {
    expect(BotEventSchema.safeParse({ type: 'chat_started', chat }).success).toBe(false)
  })

  test('validates message entities', () => {
    expect(MessageSchema.safeParse(message).success).toBe(true)
    expect(MessageSchema.safeParse({ ...message, sender: 'admin' }).success).toBe(false)
    expect(MessageSchema.safeParse({ ...message, status: 'pending' }).success).toBe(false)
  })

  test('exposes a narrowed event listener type', () => {
    const listener: BotEventListener<'command'> = (event) => {
      expectTypeOf(event.name).toEqualTypeOf<string>()
      expectTypeOf(event.chat.id).toEqualTypeOf<string>()
    }

    expectTypeOf(listener).toBeFunction()
  })
})
