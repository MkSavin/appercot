import { describe, expect, test } from 'bun:test'
import {
  ClientToServerFrameSchema,
  ClientUpdateFrameSchema,
  ClientUpdateSchema,
  ServerToClientFrameSchema,
} from '../src'

describe('client updates', () => {
  test('parses update and control frames', () => {
    const update = {
      type: 'message.status',
      chatId: 'chat-1',
      messageId: 'message-1',
      status: 'processed',
    }
    const frame = { t: 'upd', seq: 10, update }

    expect(ClientUpdateSchema.safeParse(update).success).toBe(true)
    expect(ClientUpdateFrameSchema.safeParse(frame).success).toBe(true)
    expect(ServerToClientFrameSchema.safeParse(frame).success).toBe(true)
    expect(ServerToClientFrameSchema.safeParse({ t: 'pong' }).success).toBe(true)
    expect(ClientToServerFrameSchema.safeParse({ t: 'focus', chatId: null }).success).toBe(true)
    expect(ClientToServerFrameSchema.safeParse({ t: 'ping' }).success).toBe(true)
  })

  // @anchor INV:client-updates/rejects-frames
  test('rejects unknown updates and invalid sequence numbers', () => {
    expect(ClientUpdateSchema.safeParse({ type: 'message.unknown' }).success).toBe(false)
    expect(
      ClientUpdateFrameSchema.safeParse({
        t: 'upd',
        seq: -1,
        update: { type: 'chat.cleared', chatId: 'chat-1' },
      }).success,
    ).toBe(false)
  })
})
