import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const workspace = resolve(import.meta.dir, '../../..')
const temporary = await mkdtemp(join(tmpdir(), 'appercot-runners-'))
let cli: ReturnType<typeof Bun.spawn> | undefined

const readEndpoint = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader()
  let text = ''
  while (!text.includes('\n')) {
    const next = await reader.read()
    if (next.done) break
    text += new TextDecoder().decode(next.value)
  }
  reader.releaseLock()
  if (!text) throw new Error(await new Response(cli?.stderr).text())
  return (JSON.parse(text) as { endpoint: string }).endpoint
}

try {
  await Bun.write(join(temporary, 'public/index.html'), '<html><body>Test SPA</body></html>')
  await writeFile(join(temporary, 'empty.env'), '')
  const config = join(temporary, 'config.json')
  await writeFile(
    config,
    JSON.stringify({
      server: {
        hostname: '127.0.0.1',
        port: 0,
        dataDir: join(temporary, 'data'),
        publicDir:
          process.argv.includes('--browser-only') || process.argv.includes('--with-browser')
            ? resolve(workspace, 'apps/web/dist')
            : join(temporary, 'public'),
      },
      users: [
        { id: 'user-alice', username: 'alice', displayName: 'Alice', password: 'alice-password' },
      ],
      bots: [
        {
          id: 'bot-echo',
          username: 'echo_bot',
          name: 'Echo',
          owner: 'alice',
          token: 'bot-echo:secret',
          commands: [{ name: 'start', description: 'Start', shortcut: 'Alt+S' }],
        },
      ],
      chats: [
        {
          id: 'chat-echo',
          user: 'alice',
          bot: 'echo_bot',
          messages: [{ id: 'message-ready', sender: 'bot', content: { text: 'Ready' } }],
        },
      ],
      test: { token: 'control-secret' },
    }),
  )
  const cliEnvironment: Record<string, string | undefined> = { ...process.env }
  for (const key of [
    'PORT',
    'DATA_DIR',
    'PUBLIC_URL',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'BOOTSTRAP_INVITE',
    'APPERCOT_CONFIG',
  ])
    delete cliEnvironment[key]
  cli = Bun.spawn(
    [
      process.execPath,
      '--env-file',
      join(temporary, 'empty.env'),
      'packages/test/src/cli.ts',
      '--config',
      config,
    ],
    { cwd: workspace, stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', env: cliEnvironment },
  )
  const endpoint = await readEndpoint(cli.stdout as ReadableStream<Uint8Array>)
  const env = {
    ...process.env,
    BOT_APPERCOT_TEST_ENDPOINT: endpoint,
    BOT_APPERCOT_TEST_TOKEN: 'control-secret',
  }
  const browserCommand = [
    'node',
    'packages/test/node_modules/@playwright/test/cli.js',
    'test',
    '--config',
    'packages/test/playwright.config.ts',
  ]
  const commands = process.argv.includes('--browser-only')
    ? [browserCommand]
    : process.argv.includes('--bun-only')
      ? [[process.execPath, 'test', 'packages/test/test/compatibility/bun.test.ts']]
      : [
          [process.execPath, 'test', 'packages/test/test/compatibility/bun.test.ts'],
          [
            process.execPath,
            'x',
            'vitest',
            'run',
            '--root',
            'packages/test',
            '--config',
            'vitest.config.ts',
          ],
          [
            'node',
            '--experimental-vm-modules',
            'packages/test/node_modules/jest/bin/jest.js',
            '--config',
            'packages/test/jest.config.cjs',
            '--runInBand',
          ],
          ...(process.argv.includes('--with-browser') ? [browserCommand] : []),
        ]
  for (const command of commands) {
    const child = Bun.spawn(command, { cwd: workspace, env, stdout: 'inherit', stderr: 'inherit' })
    if ((await child.exited) !== 0) throw new Error(`Runner failed: ${command.join(' ')}`)
  }
} finally {
  if (cli?.exitCode === null) (cli.stdin as Bun.FileSink).end()
  await cli?.exited
  await rm(temporary, { recursive: true, force: true })
}
