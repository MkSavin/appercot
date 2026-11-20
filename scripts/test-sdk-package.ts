import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { $ } from 'bun'

const root = resolve(import.meta.dir, '..')
const archives = join(root, 'dist', 'npm')
const scratch = resolve(tmpdir())
const consumer = await mkdtemp(join(scratch, 'appercot-sdk-'))
if (dirname(consumer) !== scratch) throw new Error('Unexpected temporary SDK project path')
try {
  await Bun.write(join(consumer, 'package.json'), '{"private":true,"type":"module"}')
  await $`npm install --ignore-scripts --no-audit --no-fund ${join(archives, 'appercot-protocol.tgz')} ${join(archives, 'appercot-chat.tgz')}`.cwd(
    consumer,
  )
  const entry = join(consumer, 'smoke.mjs')
  await Bun.write(
    entry,
    `import { createBot } from '@appercot/chat'
import { BotCommandSchema } from '@appercot/protocol'

const bot = createBot({ url: 'ws://127.0.0.1:3000/api/bot/ws', token: 'example:secret' })
bot.command('start', 'Start', context => context.reply('Ready'))
if (BotCommandSchema.parse({ name: 'start', description: 'Start' }).name !== 'start') {
  throw new Error('The installed protocol did not validate the command')
}
bot.stop()
`,
  )
  await $`bun x --no-install tsc --ignoreConfig --allowJs --checkJs --noEmit --strict --module NodeNext --target ES2022 ${entry}`.cwd(
    root,
  )
  await $`node ${entry}`.cwd(consumer)
  await $`bun --no-env-file ${entry}`.cwd(consumer)
} finally {
  await rm(consumer, { recursive: true, force: true })
}
