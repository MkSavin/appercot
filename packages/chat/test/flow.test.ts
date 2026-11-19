import { describe, expect, test } from 'bun:test'
import type { BotEvent, Message, MessageContent } from '@appercot/protocol'
import { Context, createBot } from '../src'

const chat = { id: 'chat-1', roles: [], blocked: false, createdAt: 1 }
const user = { id: 'user-1', username: 'user', displayName: 'User' }

const message = (id: string, content: MessageContent, sender: 'user' | 'bot' = 'bot'): Message => ({
  id,
  chatId: chat.id,
  seq: Number(id.replace(/\D/g, '')) || 1,
  sender,
  content,
  status: 'processed',
  createdAt: 1,
})

class FakeBotApi {
  readonly values = new Map<string, unknown>()
  readonly sent: MessageContent[] = []
  readonly edits: MessageContent[] = []
  readonly deleted: string[] = []
  readonly answers: Array<string | undefined> = []
  private nextMessageId = 1

  async kvGet() {
    return Object.fromEntries(this.values)
  }

  async kvSet(params: { entries: Record<string, unknown> }) {
    for (const [key, value] of Object.entries(params.entries)) {
      if (value === null) this.values.delete(key)
      else this.values.set(key, value)
    }
    return { used: 0 }
  }

  async sendMessage(params: { content: MessageContent }) {
    this.sent.push(params.content)
    return message(`message-${this.nextMessageId++}`, params.content)
  }

  async editMessage(params: { messageId: string; content: MessageContent }) {
    this.edits.push(params.content)
    return message(params.messageId, params.content)
  }

  async deleteMessage(params: { messageId: string }) {
    this.deleted.push(params.messageId)
    return { ok: true }
  }

  async answerCallback(params: { toast?: string }) {
    this.answers.push(params.toast)
    return { ok: true }
  }
}

const setup = () => {
  const bot = createBot({ url: 'ws://localhost/api/bot/ws', token: 'token' })
  const api = new FakeBotApi()
  Object.defineProperty(bot, 'api', { value: api })
  return { bot, api }
}

const dispatch = async (bot: ReturnType<typeof createBot>, event: BotEvent) => {
  const dispatcher = bot as unknown as { dispatch: (event: BotEvent) => Promise<void> }
  await dispatcher.dispatch(event)
}

const startedEvent = (): BotEvent => ({ type: 'chat_started', chat, user })
const callbackEvent = (data: string): BotEvent => ({
  type: 'callback',
  chat,
  user,
  data,
  callbackId: 'callback-1',
  messageId: 'message-1',
})
const messageEvent = (text: string): BotEvent => ({
  type: 'message',
  chat,
  user,
  message: message('user-message', { text }, 'user'),
})

const firstCallback = (content: MessageContent | undefined) => {
  const button = content?.buttons?.[0]?.[0]
  if (!button || !('callback' in button)) throw new Error('Callback button is missing')
  return button.callback
}

const createOrderFlow = (bot: ReturnType<typeof createBot>) => {
  const order = bot
    .flow('order')
    .state(() => ({ size: '', qty: 1 }))
    .start('size')
  order
    .screen('size')
    .text('Выберите размер')
    .button('S', (state) => {
      state.size = 'S'
    })
    .to('qty')
    .button('Отмена')
    .cancel()
  order
    .screen('qty')
    .text((state) => `Размер ${state.size}. Сколько штук?`)
    .input((state, text) => {
      const quantity = Number(text)
      if (!Number.isInteger(quantity) || quantity < 1) return 'Нужно целое число ≥ 1'
      state.qty = quantity
    })
    .to('confirm')
  order
    .screen('confirm')
    .text((state) => `${state.qty} × ${state.size}. Подтвердить?`)
    .button('Да')
    .on((_state, context) => context.finish('Заказ принят'))
    .button('Назад')
    .back()
  return order
}

describe('bot flows', () => {
  // @anchor INV:flow/consumes-text
  test('moves between edited screens, validates input and finishes', async () => {
    const { bot, api } = setup()
    const order = createOrderFlow(bot)
    const context = new Context(startedEvent(), bot.api)
    await order.start(context)
    expect(api.sent[0]?.text).toBe('Выберите размер')
    const sizeCallback = firstCallback(api.sent[0])

    await dispatch(bot, callbackEvent(sizeCallback))
    expect(api.edits.at(-1)?.text).toBe('Размер S. Сколько штук?')
    await dispatch(bot, messageEvent('0'))
    expect(api.deleted).toEqual(['user-message'])
    expect(api.sent.at(-1)?.text).toBe('Нужно целое число ≥ 1')
    await dispatch(bot, messageEvent('2'))
    expect(api.deleted).toEqual(['user-message', 'user-message'])
    expect(api.edits.at(-1)?.text).toBe('2 × S. Подтвердить?')

    await dispatch(bot, callbackEvent(firstCallback(api.edits.at(-1))))
    expect(api.edits.at(-1)).toEqual({ text: 'Заказ принят' })
    expect(api.values.has('__flow :order')).toBe(false)
    expect(api.answers).toEqual([undefined, undefined])
  })

  // @anchor INV:flow/rejects-stale
  test('rejects a button from an outdated screen', async () => {
    const { bot, api } = setup()
    const order = createOrderFlow(bot)
    await order.start(new Context(startedEvent(), bot.api))
    const sizeCallback = firstCallback(api.sent[0])
    await dispatch(bot, callbackEvent(sizeCallback))
    const editCount = api.edits.length

    await dispatch(bot, callbackEvent(sizeCallback))
    expect(api.answers.at(-1)).toBe('Устаревшая кнопка')
    expect(api.edits).toHaveLength(editCount)
  })

  test('cancels active flows for commands and clears them with the chat', async () => {
    const { bot, api } = setup()
    const order = createOrderFlow(bot)
    let commandHandled = false
    bot.command('help', () => {
      commandHandled = true
    })
    await order.start(new Context(startedEvent(), bot.api))
    await dispatch(bot, {
      type: 'command',
      chat,
      user,
      name: 'help',
      message: message('command-message', { text: '/help' }, 'user'),
    })
    expect(commandHandled).toBe(true)
    expect(api.values.has('__flow :order')).toBe(false)

    await order.start(new Context(startedEvent(), bot.api))
    await dispatch(bot, { type: 'chat_cleared', chat, user })
    expect(api.values.has('__flow :order')).toBe(false)
  })

  test('supports groups, back navigation and cancellation', async () => {
    const { bot, api } = setup()
    const flow = bot
      .flow('shipping')
      .state(() => ({ address: '', zip: '' }))
      .start('welcome')
    flow.screen('welcome').text('Доставка?').button('Далее').enter('shipping')
    flow
      .group('shipping')
      .screen('address')
      .text('Адрес?')
      .input((state, text) => {
        state.address = text
      })
      .to('zip')
      .button('Отмена')
      .cancel()
      .screen('zip')
      .text('Индекс?')
      .input((state, text) => {
        state.zip = text
      })
      .to('/done')
      .button('Назад')
      .back()
    flow.screen('done').text('Готово').button('Завершить').cancel()

    await flow.start(new Context(startedEvent(), bot.api))
    await dispatch(bot, callbackEvent(firstCallback(api.sent[0])))
    expect(api.edits.at(-1)?.text).toBe('Адрес?')
    await dispatch(bot, messageEvent('Москва'))
    expect(api.edits.at(-1)?.text).toBe('Индекс?')
    await dispatch(bot, callbackEvent(firstCallback(api.edits.at(-1))))
    expect(api.edits.at(-1)?.text).toBe('Адрес?')
    await dispatch(bot, callbackEvent(firstCallback(api.edits.at(-1))))
    expect(api.deleted).toEqual(['user-message', 'message-1'])
    expect(api.values.has('__flow :shipping')).toBe(false)
  })

  test('validates transitions, duplicate screens and exits before connecting', async () => {
    const { bot } = setup()
    const broken = bot
      .flow('broken')
      .state(() => ({}))
      .start('first')
    broken.screen('first').text('First').button('Next').to('missing')
    await expect(bot.start()).rejects.toThrow('missing')
    expect(() => broken.screen('first')).toThrow('already exists')

    const invalid = createBot({ url: 'ws://localhost/api/bot/ws', token: 'token' })
    invalid.flow('invalid').start('screen').screen('screen').text('No exit')
    await expect(invalid.start()).rejects.toThrow('exit')
  })
})
