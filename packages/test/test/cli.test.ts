import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AppercotTestClient } from '../src/index'

const streamText = (stream: unknown) => new Response(stream as ReadableStream<Uint8Array>).text()

const readLine = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader()
  let text = ''
  const deadline = Date.now() + 15_000
  try {
    while (!text.includes('\n')) {
      if (Date.now() > deadline) throw new Error('Timed out waiting for CLI endpoint')
      const next = await reader.read()
      if (next.done) break
      text += new TextDecoder().decode(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  return text.split('\n')[0]?.trim() ?? ''
}

const cleanEnvironment = () => {
  const environment: Record<string, string | undefined> = { ...process.env, NODE_ENV: 'test' }
  for (const key of [
    'PORT',
    'DATA_DIR',
    'PUBLIC_URL',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'BOOTSTRAP_INVITE',
    'APPERCOT_CONFIG',
  ])
    delete environment[key]
  return environment
}

describe('appercot-test-server CLI', () => {
  let root: string
  let processUnderTest: ReturnType<typeof Bun.spawn> | undefined

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'appercot-cli-'))
    await writeFile(join(root, 'empty.env'), '')
  })

  afterEach(async () => {
    if (processUnderTest && processUnderTest.exitCode === null) processUnderTest.kill('SIGKILL')
    await processUnderTest?.exited
    processUnderTest = undefined
    await rm(root, { recursive: true, force: true })
  })

  const writeConfig = async (value: unknown) => {
    const path = join(root, 'config.json')
    await writeFile(path, JSON.stringify(value))
    return path
  }

  test('starts the real server, prints one endpoint JSON line and shuts down cleanly', async () => {
    const publicDir = join(root, 'public')
    await Bun.write(join(publicDir, 'index.html'), '<html><body>SPA</body></html>')
    const dataDir = join(root, 'data')
    const config = await writeConfig({
      server: { hostname: '127.0.0.1', port: 0, dataDir, publicDir },
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
        },
      ],
      chats: [{ id: 'chat-echo', user: 'alice', bot: 'echo_bot', messages: [] }],
      test: { token: 'control-secret' },
    })
    processUnderTest = Bun.spawn(
      [
        process.execPath,
        '--env-file',
        join(root, 'empty.env'),
        'packages/test/src/cli.ts',
        '--config',
        config,
      ],
      {
        cwd: join(import.meta.dir, '../../..'),
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'pipe',
        env: cleanEnvironment(),
      },
    )

    const line = await readLine(processUnderTest.stdout as ReadableStream<Uint8Array>)
    if (!line) throw new Error(await streamText(processUnderTest.stderr))
    const { endpoint } = JSON.parse(line) as { endpoint: string }
    const client = new AppercotTestClient({ endpoint, token: 'control-secret' })
    await client.ready()
    expect((await client.fixtures()).chats[0]?.id).toBe('chat-echo')
    const page = await fetch(endpoint).then((response) => response.text())
    expect(page).toContain('SPA')

    ;(processUnderTest.stdin as Bun.FileSink).end()
    expect(await processUnderTest.exited).toBe(0)
    expect(existsSync(join(dataDir, '.appercot-test.lock'))).toBe(false)
    expect(existsSync(join(dataDir, 'appercot.sqlite'))).toBe(true)

    processUnderTest = Bun.spawn(
      [
        process.execPath,
        '--env-file',
        join(root, 'empty.env'),
        'packages/test/src/cli.ts',
        '--config',
        config,
      ],
      {
        cwd: join(import.meta.dir, '../../..'),
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'pipe',
        env: cleanEnvironment(),
      },
    )
    const restartedLine = await readLine(processUnderTest.stdout as ReadableStream<Uint8Array>)
    if (!restartedLine) throw new Error(await streamText(processUnderTest.stderr))
    const restarted = JSON.parse(restartedLine) as { endpoint: string }
    const restartedClient = new AppercotTestClient({
      endpoint: restarted.endpoint,
      token: 'control-secret',
    })
    await restartedClient.ready()
    expect((await restartedClient.fixtures()).chats[0]?.id).toBe('chat-echo')
    ;(processUnderTest.stdin as Bun.FileSink).end()
    expect(await processUnderTest.exited).toBe(0)
    expect(existsSync(join(dataDir, '.appercot-test.lock'))).toBe(false)
  }, 20_000)

  test('fails before listen for missing SPA and nonempty unmarked dataDir', async () => {
    const dataDir = join(root, 'occupied')
    await Bun.write(join(dataDir, 'keep.txt'), 'keep')
    const config = await writeConfig({
      server: { port: 0, dataDir, publicDir: join(root, 'missing-public') },
      test: { token: 'control-secret' },
    })
    processUnderTest = Bun.spawn(
      [
        process.execPath,
        '--env-file',
        join(root, 'empty.env'),
        'packages/test/src/cli.ts',
        '--config',
        config,
      ],
      {
        cwd: join(import.meta.dir, '../../..'),
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'pipe',
        env: cleanEnvironment(),
      },
    )
    expect(await processUnderTest.exited).not.toBe(0)
    const diagnostics = await streamText(processUnderTest.stderr)
    expect(diagnostics).toMatch(/index\.html|unmarked|not empty/i)
    expect(await streamText(processUnderTest.stdout)).toBe('')
  }, 20_000)
})
