import { createBot } from '@appercot/chat'

const token = process.env.BOT_TOKEN
if (!token) throw new Error('BOT_TOKEN is required')

const bot = createBot({
  url: process.env.BOT_URL ?? 'ws://localhost:3000/api/bot/ws',
  token,
})

const profile = bot
  .flow('profile')
  .state(() => ({ name: '', city: '' }))
  .start('welcome')

profile
  .screen('welcome')
  .text('Заполните профиль в три шага. Начнём?')
  .button('Начать')
  .enter('profile')
  .button('Отмена')
  .cancel()

profile
  .group('profile')
  .screen('name')
  .text('Шаг 1 из 3. Как вас зовут?')
  .input((state, text) => {
    const name = text.trim()
    if (name.length < 2) return 'Введите имя длиной не менее 2 символов'
    state.name = name
  })
  .to('city')
  .button('Отмена')
  .cancel()
  .screen('city')
  .text((state) => `Шаг 2 из 3, ${state.name}. В каком городе вы живёте?`)
  .input((state, text) => {
    const city = text.trim()
    if (!city) return 'Введите город'
    state.city = city
  })
  .to('/confirm')
  .button('Назад')
  .back()
  .button('Отмена')
  .cancel()

profile
  .screen('confirm')
  .text((state) => `Шаг 3 из 3. Сохранить профиль?\nИмя: ${state.name}\nГород: ${state.city}`)
  .button('Сохранить')
  .on((_state, context) => context.finish('Профиль сохранён'))
  .button('Назад')
  .back()
  .button('Отмена')
  .cancel()

bot.command('profile', (context) => profile.start(context))
bot.command('help', (context) => context.reply('/profile — заполнить профиль'))
bot.on('chat_started', (context) => context.reply('Используйте /profile для запуска мастера'))

await bot.start({
  commands: [
    { name: 'profile', description: 'Заполнить профиль' },
    { name: 'help', description: 'Помощь' },
  ],
})

console.log('Wizard bot connected')
