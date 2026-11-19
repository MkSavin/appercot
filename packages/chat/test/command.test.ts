import { expect, test } from 'bun:test'
import type { MessageContent } from '@appercot/protocol'
import { type BotApi, Context, createBot } from '../src'

// @anchor INV:command/formats-reply
test('formats command references and replaces a custom role through the bot API', async () => {
  const bot = createBot({ url: 'ws://localhost/api/bot/ws', token: 'test' })
  const profile = bot
    .command('profile', 'Заполнить профиль', () => {})
    .roles('user', 'owner')
    .shortcut('Mod+Shift+P')
  const help = bot.command('help', 'Помощь', () => {}).roles('guest', 'all')
  const sent: MessageContent[] = []
  const grants: string[][] = []
  const api = {
    sendMessage: ({ content }: { content: MessageContent }) => sent.push(content),
    setChatRoles: ({ roles }: { roles: string[] }) => grants.push(roles),
  } as unknown as BotApi
  const context = new Context(
    {
      type: 'chat_started',
      chat: { id: 'chat', roles: ['owner'], blocked: false, createdAt: 1 },
      user: { id: 'user', username: 'user', displayName: 'User' },
    },
    api,
  )
  await context.replyWithCommand([profile, help], 'Используйте %s или %s.')
  await context.replyWithCommand(help)
  await context.setRole('user')
  await context.setRole(null)
  expect(profile.toJSON()).toMatchObject({ roles: ['user', 'owner'], shortcut: 'Mod+Shift+P' })
  expect(sent).toEqual([{ text: 'Используйте /profile или /help.' }, { text: '/help — Помощь' }])
  expect(grants).toEqual([['user'], []])
})
