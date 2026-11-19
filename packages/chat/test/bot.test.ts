import { describe, expect, test } from 'bun:test'
import { createBotToken } from '../../../apps/server/src/auth/bot-token'
import { bots } from '../../../apps/server/src/db/schema'
import { createServerFixture, graphqlRequest } from '../../../apps/server/test/helpers'
import { createBot } from '../src'

const waitForMessages = async (baseUrl: string, cookie: string, chatId: string, count: number) => {
  const deadline = Date.now() + 5000
  for (;;) {
    const result = await graphqlRequest(
      baseUrl,
      'query($chatId: ID!) { messages(chatId: $chatId) { sender content } }',
      { chatId },
      cookie,
    )
    const messages = result.body.data.messages as Array<{
      sender: string
      content: { text?: string }
    }>
    if (messages.length >= count) return messages
    if (Date.now() > deadline) throw new Error(`Expected ${count} messages, got ${messages.length}`)
    await Bun.sleep(25)
  }
}

describe('bot SDK', () => {
  // @anchor INV:bot/orders-events
  test('handles events sequentially and persists storage', async () => {
    const fixture = createServerFixture()
    let sdk: ReturnType<typeof createBot> | undefined
    try {
      const login = await graphqlRequest(
        fixture.baseUrl,
        'mutation { login(username: "admin", password: "password123") { user { id } } }',
      )
      const cookie = login.response.headers.get('set-cookie')
      if (!cookie) throw new Error('Cookie is missing')
      const botId = Bun.randomUUIDv7()
      const token = createBotToken(botId)
      fixture.db
        .insert(bots)
        .values({
          id: botId,
          username: 'sdkbot',
          name: 'SDK',
          description: 'SDK integration',
          tokenHash: token.hash,
          roles: [],
          defaultRoles: [],
          commandsRev: 0,
          createdAt: Date.now(),
        })
        .run()

      const handled: string[] = []
      sdk = createBot({
        url: `${fixture.baseUrl.replace('http:', 'ws:')}/api/bot/ws`,
        token: token.token,
      })
      sdk.on('chat_started', (ctx) => ctx.reply('Welcome'))
      sdk.command('start', (ctx) => ctx.reply('Started'))
      sdk.on('message', async (ctx) => {
        const count = (await ctx.storage.get<number>('count')) ?? 0
        handled.push(ctx.text)
        if (handled.length === 1) await Bun.sleep(50)
        await ctx.storage.set('count', count + 1)
        await ctx.reply(`Echo ${ctx.text}: ${count + 1}`)
      })
      await sdk.start({ commands: [{ name: 'start', description: 'Start' }] })

      const added = await graphqlRequest(
        fixture.baseUrl,
        'mutation { addBot(username: "sdkbot") { id } }',
        {},
        cookie,
      )
      const chatId = (added.body.data.addBot as { id: string }).id
      await waitForMessages(fixture.baseUrl, cookie, chatId, 1)

      const send = (text: string, clientId: string) =>
        graphqlRequest(
          fixture.baseUrl,
          'mutation($input: SendMessageInput!) { sendMessage(input: $input) { id } }',
          { input: { chatId, clientId, content: { text } } },
          cookie,
        )
      await send('First', 'first')
      await send('Second', 'second')
      await send('/start', 'start-command')
      const messages = await waitForMessages(fixture.baseUrl, cookie, chatId, 7)

      expect(messages.map((message) => message.content.text)).toEqual([
        'Welcome',
        'First',
        'Second',
        '/start',
        'Echo First: 1',
        'Echo Second: 2',
        'Started',
      ])
      expect(handled).toEqual(['First', 'Second'])
      expect((await sdk.api.kvGet({ chatId })).count).toBe(2)
    } finally {
      sdk?.stop()
      fixture.stop()
    }
  })

  // @anchor INV:bot/restarts-connection
  test('rejects waits on stop and supports a subsequent start', async () => {
    const fixture = createServerFixture()
    const botId = Bun.randomUUIDv7()
    const token = createBotToken(botId)
    const sdk = createBot({
      url: `${fixture.baseUrl.replace('http:', 'ws:')}/api/bot/ws`,
      token: token.token,
    })
    try {
      fixture.db
        .insert(bots)
        .values({
          id: botId,
          username: 'restartbot',
          name: 'Restart',
          description: '',
          tokenHash: token.hash,
          roles: [],
          defaultRoles: [],
          commandsRev: 0,
          createdAt: Date.now(),
        })
        .run()
      const starting = sdk.start()
      sdk.stop()
      await expect(starting).rejects.toThrow('Connection stopped')
      await sdk.start()
      sdk.stop()
      await sdk.start({ commands: [{ name: 'ping', description: 'Ping' }] })
    } finally {
      sdk.stop()
      fixture.stop()
    }
  })
})
