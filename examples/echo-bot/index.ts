import { createBot } from '@appercot/chat'

const token = process.env.BOT_TOKEN
if (!token) throw new Error('BOT_TOKEN is required')

const bot = createBot({
  url: process.env.BOT_URL ?? 'ws://localhost:3000/api/bot/ws',
  token,
})

bot.command('start', (ctx) => ctx.reply(`Привет, **${ctx.user.displayName}**`))
bot.command('help', (ctx) => ctx.reply('/start — приветствие\nТекст — эхо и счётчик'))
bot.on('chat_started', (ctx) => ctx.reply('Это echo-бот. Используйте /help'))
bot.on('message', async (ctx) => {
  const count = (await ctx.storage.get<number>('messages')) ?? 0
  await ctx.storage.set('messages', count + 1)
  await ctx.reply({
    text: `Эхо: ${ctx.text}\nСообщений: ${count + 1}`,
    buttons: [[{ text: 'Показать счётчик', callback: 'count' }]],
  })
})
bot.on('callback', async (ctx) => {
  const count = (await ctx.storage.get<number>('messages')) ?? 0
  await ctx.answer(`Сообщений: ${count}`)
})

await bot.start({
  commands: [
    { name: 'start', description: 'Начать' },
    { name: 'help', description: 'Помощь' },
  ],
})

console.log('Echo bot connected')
