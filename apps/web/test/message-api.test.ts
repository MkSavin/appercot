import { expect, test } from 'bun:test'
import { parseGraphqlMessage } from '../src/entities/message/api/message-api'

test('GraphQL nullable message fields become optional protocol fields', () => {
  const message = parseGraphqlMessage({
    id: 'message-1',
    chatId: 'chat-1',
    seq: 1,
    sender: 'bot',
    content: { text: 'Hello' },
    status: 'processed',
    replyTo: null,
    createdAt: 1000,
    editedAt: null,
  })

  expect(message).toEqual({
    id: 'message-1',
    chatId: 'chat-1',
    seq: 1,
    sender: 'bot',
    content: { text: 'Hello' },
    status: 'processed',
    createdAt: 1000,
  })
  expect('replyTo' in message).toBe(false)
  expect('editedAt' in message).toBe(false)
})
