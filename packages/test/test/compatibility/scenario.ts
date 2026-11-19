import assert from 'node:assert/strict'
import { createBot } from '@appercot/chat'
import type { Message } from '@appercot/protocol'
import type { AppercotTestClient } from '../../src/index'

const graphql = async (
  endpoint: string,
  query: string,
  variables: Record<string, unknown> = {},
  cookie?: string,
) => {
  const response = await fetch(`${endpoint}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ query, variables }),
  })
  const payload = (await response.json()) as {
    data?: Record<string, unknown>
    errors?: Array<{ message: string }>
  }
  assert.equal(payload.errors, undefined, JSON.stringify(payload.errors))
  return { response, data: payload.data ?? {} }
}

const waitFor = async <Value>(read: () => Promise<Value | undefined>) => {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const value = await read()
    if (value !== undefined) return value
    await new Promise((resolve) => setTimeout(resolve, 40))
  }
  throw new Error('Timed out waiting for bot scenario')
}

export const runBotEnvironmentScenario = async (client: AppercotTestClient, endpoint: string) => {
  const manifest = await client.fixtures()
  const user = manifest.users[0]
  const botFixture = manifest.bots[0]
  const chat = manifest.chats[0]
  assert.ok(user && botFixture && chat)
  const login = await graphql(
    endpoint,
    'mutation Login($username: String!, $password: String!) { login(username: $username, password: $password) { user { id } } }',
    { username: user.username, password: user.password },
  )
  const cookie = login.response.headers.get('set-cookie')
  assert.ok(cookie)
  const history = async () => {
    const result = await graphql(
      endpoint,
      'query History($chatId: ID!) { messages(chatId: $chatId) { id chatId seq sender content status createdAt } }',
      { chatId: chat.id },
      cookie,
    )
    return result.data.messages as Message[]
  }

  const sdk = createBot({
    url: `${endpoint.replace(/^http/, 'ws')}/api/bot/ws`,
    token: botFixture.token,
  })
  const start = sdk.command('start', 'Start', (context) =>
    context.reply({ text: 'Ready', buttons: [[{ text: 'Ping', callback: 'ping' }]] }),
  )
  sdk.on('callback', (context) => context.answer('Pong'))
  try {
    sdk.commands([start])
    await sdk.start()
    await client.sendMessage({
      chatId: chat.id,
      sender: 'user',
      clientId: `command-${Date.now()}`,
      content: { text: '/start' },
    })
    const ready = await waitFor(async () =>
      (await history()).find(
        (message) =>
          message.sender === 'bot' &&
          message.content.text === 'Ready' &&
          message.content.buttons
            ?.flat()
            .some((button) => 'callback' in button && button.callback === 'ping'),
      ),
    )
    const pressed = await graphql(
      endpoint,
      'mutation Press($chatId: ID!, $messageId: ID!) { pressButton(chatId: $chatId, messageId: $messageId, data: "ping") { toast } }',
      { chatId: chat.id, messageId: ready.id },
      cookie,
    )
    assert.equal((pressed.data.pressButton as { toast: string }).toast, 'Pong')

    await client.flushChat(chat.id)
    assert.equal((await history()).length, chat.messages.length)
    await client.sendMessage({
      chatId: chat.id,
      sender: 'user',
      clientId: `after-reset-${Date.now()}`,
      content: { text: '/start' },
    })
    await waitFor(async () =>
      (await history()).find(
        (message) =>
          message.sender === 'bot' &&
          message.content.text === 'Ready' &&
          message.content.buttons
            ?.flat()
            .some((button) => 'callback' in button && button.callback === 'ping'),
      ),
    )
  } finally {
    sdk.stop()
  }
}
