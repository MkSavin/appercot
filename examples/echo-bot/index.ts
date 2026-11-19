import { createBot } from '@appercot/chat'

const token = process.env.BOT_TOKEN
if (!token) throw new Error('BOT_TOKEN is required')

const bot = createBot({
  url: process.env.BOT_URL ?? 'ws://localhost:3000/api/bot/ws',
  token,
})

const start = bot
  .command('start', 'Начать', (ctx) => ctx.reply(`Привет, **${ctx.user.displayName}**`))
  .roles('all', 'guest')
const help = bot
  .command('help', 'Помощь', (ctx) => ctx.replyWithCommand(start, 'Для приветствия выполните %s.'))
  .roles('all', 'guest')
  .shortcut('Mod+Shift+H')
bot.on('chat_started', (ctx) => ctx.replyWithCommand(help, 'Это echo-бот. Используйте %s.'))
bot.on('message', async (ctx) => {
  const count = (await ctx.storage.get<number>('messages')) ?? 0
  await ctx.storage.set('messages', count + 1)
  await ctx.reply({
    text: `Эхо: ${ctx.text}\nСообщений: ${count + 1}`,
    buttons: [[{ text: 'Показать счётчик', callback: 'count', shortcut: 'Alt+C' }]],
  })
})
bot.on('callback', async (ctx) => {
  const count = (await ctx.storage.get<number>('messages')) ?? 0
  await ctx.answer(`Сообщений: ${count}`)
})

bot.commands([start, help])
await bot.start({ roles: [{ code: 'user', name: 'Участник' }] })

console.log('Echo bot connected')
