import { describe, expect, expectTypeOf, test } from 'bun:test'
import {
  BotRequestFrameSchema,
  BotResponseFrameSchema,
  BotToServerFrameSchema,
  HelloFrameSchema,
  type Params,
  type Result,
  ServerToBotFrameSchema,
} from '../src'

describe('bot RPC frames', () => {
  test('parses a typed request and validates method params', () => {
    const frame = {
      t: 'req',
      id: 'request-1',
      method: 'sendMessage',
      params: { chatId: 'chat-1', content: { text: 'Hello' } },
    }

    expect(BotRequestFrameSchema.safeParse(frame).success).toBe(true)
    expect(BotToServerFrameSchema.safeParse(frame).success).toBe(true)
    expect(
      BotRequestFrameSchema.safeParse({
        ...frame,
        params: { chatId: 'chat-1', content: { text: 'Hello', buttons: [] } },
      }).success,
    ).toBe(false)
  })

  test('parses successful and failed responses', () => {
    const success = { t: 'res', id: 'request-1', ok: true, result: { ok: true } }
    const failure = {
      t: 'res',
      id: 'request-1',
      ok: false,
      error: { code: 'KV_QUOTA', message: 'Quota exceeded' },
    }

    expect(BotResponseFrameSchema.safeParse(success).success).toBe(true)
    expect(BotResponseFrameSchema.safeParse(failure).success).toBe(true)
    expect(ServerToBotFrameSchema.safeParse(success).success).toBe(true)
    expect(
      BotResponseFrameSchema.safeParse({
        ...failure,
        error: { code: 'UNKNOWN', message: 'Unknown' },
      }).success,
    ).toBe(false)
  })

  test('parses hello, event and acknowledgement frames', () => {
    const bot = {
      id: 'bot-1',
      username: 'examplebot',
      name: 'Example',
      description: '',
      online: true,
    }
    const hello = {
      t: 'hello',
      protocol: 1,
      bot,
      commands: [{ name: 'start', description: 'Start' }],
    }
    const event = {
      t: 'evt',
      seq: 1,
      event: {
        type: 'chat_started',
        chat: { id: 'chat-1', roles: [], blocked: false, createdAt: 1 },
        user: { id: 'user-1', username: 'alice', displayName: 'Alice' },
      },
    }
    const ack = { t: 'ack', seq: 1 }

    expect(HelloFrameSchema.safeParse(hello).success).toBe(true)
    expect(ServerToBotFrameSchema.safeParse(event).success).toBe(true)
    expect(BotToServerFrameSchema.safeParse(ack).success).toBe(true)
    expect(ServerToBotFrameSchema.safeParse({ ...hello, protocol: 2 }).success).toBe(false)
    expect(BotToServerFrameSchema.safeParse({ ...ack, seq: 0 }).success).toBe(false)
  })

  test('exposes method parameter and result types', () => {
    expectTypeOf<Params<'sendMessage'>['chatId']>().toEqualTypeOf<string>()
    expectTypeOf<Result<'sendMessage'>['seq']>().toEqualTypeOf<number>()
    expectTypeOf<Params<'kvSet'>['entries']>().toBeObject()
  })
})
