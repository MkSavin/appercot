import '../src/shared/config/i18n'
import { describe, expect, test } from 'bun:test'
import type { Message } from '@appercot/protocol'
import { ClientError } from 'graphql-request'
import { createChatStore, type SessionPayload } from '../src/entities/chat/model/store'
import { createDurableMessaging } from '../src/features/send-message/model/durable-messaging'
import type { OutboxRecord } from '../src/features/send-message/model/local-records'
import { createMemoryRepository } from '../src/features/send-message/model/memory-repository'

const session = (userId = 'user-1'): SessionPayload => ({
  user: { id: userId, username: userId, displayName: userId, role: 'user' },
  chats: [
    {
      id: 'chat-1',
      bot: {
        id: 'bot-1',
        username: 'echobot',
        name: 'Echo',
        description: '',
        online: true,
        listed: true,
      },
      roles: [],
      blocked: false,
      unread: 0,
      lastMessageAt: null,
      createdAt: 1,
    },
  ],
  vapidPublicKey: null,
  botWebSocketUrl: 'ws://appercot.invalid/api/bot/ws',
})

const response = (
  input: { chatId: string; content: Message['content'] },
  id = 'message-1',
): Message => ({
  id,
  chatId: input.chatId,
  seq: 1,
  sender: 'user',
  content: input.content,
  status: 'accepted',
  createdAt: 1000,
})

const outboxRecord = (overrides: Partial<OutboxRecord> = {}): OutboxRecord => ({
  userId: 'user-1',
  chatId: 'chat-1',
  clientId: 'client-1',
  content: { text: 'Persisted' },
  createdAt: 1000,
  state: 'queued',
  attempts: 0,
  nextAttemptAt: 0,
  updatedAt: 1000,
  ...overrides,
})

const waitFor = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
  throw new Error('Condition was not reached')
}

const graphQLError = (code: string) =>
  new ClientError(
    {
      status: 200,
      headers: new Headers(),
      errors: [{ message: code, extensions: { code } }],
    } as never,
    { query: 'mutation SendMessage', variables: {} },
  )

describe('durable messaging', () => {
  // @anchor INV:durable-messaging/restores-records
  test('restores drafts without sending them and persists edits and deletion', async () => {
    const repository = createMemoryRepository()
    await repository.putDraft({
      userId: 'user-1',
      chatId: 'chat-1',
      text: 'Restored draft',
      updatedAt: 1,
    })
    const store = createChatStore()
    store.getState().setSession(session())
    const first = createDurableMessaging({
      store,
      repository,
      broadcast: false,
      request: async () => {
        throw new Error('A draft must not be sent')
      },
    })
    await first.start()
    expect(store.getState().draftsByChat['chat-1']).toBe('Restored draft')

    first.setDraft('chat-1', 'Edited draft')
    await first.flushDraft('chat-1')
    expect((await repository.listDrafts('user-1')).records[0]?.text).toBe('Edited draft')
    first.stop()

    const restoredStore = createChatStore()
    restoredStore.getState().setSession(session())
    const second = createDurableMessaging({
      store: restoredStore,
      repository,
      broadcast: false,
      request: async () => response({ chatId: 'chat-1', content: { text: 'Unexpected' } }),
    })
    await second.start()
    expect(restoredStore.getState().draftsByChat['chat-1']).toBe('Edited draft')
    second.setDraft('chat-1', '')
    await second.flushDraft('chat-1')
    expect((await repository.listDrafts('user-1')).records).toEqual([])
    second.stop()
  })

  test('atomically queues a message and clears only the consumed draft', async () => {
    const repository = createMemoryRepository()
    const store = createChatStore()
    store.getState().setSession(session())
    let resolveRequest: ((message: Message) => void) | undefined
    const runtime = createDurableMessaging({
      store,
      repository,
      broadcast: false,
      request: () => new Promise<Message>((resolve) => (resolveRequest = resolve)),
    })
    await runtime.start()
    runtime.setDraft('chat-1', 'Hello')
    await runtime.flushDraft('chat-1')
    await runtime.enqueue({
      chatId: 'chat-1',
      clientId: 'client-1',
      content: { text: 'Hello' },
      createdAt: 1000,
      clearDraft: 'Hello',
    })

    expect(store.getState().draftsByChat['chat-1']).toBe('')
    expect((await repository.listDrafts('user-1')).records).toEqual([])
    expect((await repository.listOutbox('user-1')).records[0]?.clientId).toBe('client-1')
    resolveRequest?.(response({ chatId: 'chat-1', content: { text: 'Hello' } }))
    await waitFor(() => store.getState().messagesByChat['chat-1']?.[0]?.id === 'message-1')
    runtime.stop()
  })

  // @anchor INV:durable-messaging/reuses-id
  test('recovers a sending record after a crash with the same client id', async () => {
    const repository = createMemoryRepository()
    await repository.putOutbox(outboxRecord({ state: 'sending', attempts: 1 }))
    const store = createChatStore()
    store.getState().setSession(session())
    const clientIds: string[] = []
    const runtime = createDurableMessaging({
      store,
      repository,
      broadcast: false,
      request: async (input) => {
        clientIds.push(input.clientId)
        return response(input)
      },
    })
    await runtime.start()
    await waitFor(() => store.getState().messagesByChat['chat-1']?.[0]?.id === 'message-1')

    expect(clientIds).toEqual(['client-1'])
    expect((await repository.listOutbox('user-1')).records).toEqual([])
    expect(store.getState().messagesByChat['chat-1']).toHaveLength(1)
    runtime.stop()
  })

  test('keeps FIFO order with one in-flight request per chat', async () => {
    const repository = createMemoryRepository()
    const store = createChatStore()
    store.getState().setSession(session())
    const calls: string[] = []
    let releaseFirst: ((message: Message) => void) | undefined
    const runtime = createDurableMessaging({
      store,
      repository,
      broadcast: false,
      request: async (input) => {
        calls.push(input.clientId)
        if (input.clientId === 'client-1') {
          return new Promise<Message>((resolve) => (releaseFirst = resolve))
        }
        return response(input, 'message-2')
      },
    })
    await runtime.start()
    await runtime.enqueue({
      chatId: 'chat-1',
      clientId: 'client-1',
      content: { text: 'First' },
      createdAt: 1000,
    })
    await runtime.enqueue({
      chatId: 'chat-1',
      clientId: 'client-2',
      content: { text: 'Second' },
      createdAt: 1001,
    })
    await waitFor(() => calls.length === 1)
    expect(calls).toEqual(['client-1'])

    releaseFirst?.(response({ chatId: 'chat-1', content: { text: 'First' } }))
    await waitFor(() => calls.length === 2)
    expect(calls).toEqual(['client-1', 'client-2'])
    await waitFor(() => store.getState().pendingByChat['chat-1']?.length === 0)
    runtime.stop()
  })

  test('keeps permanent failures for a manual retry without automatic retries', async () => {
    const repository = createMemoryRepository()
    const store = createChatStore()
    store.getState().setSession(session())
    let shouldFail = true
    let calls = 0
    const runtime = createDurableMessaging({
      store,
      repository,
      broadcast: false,
      random: () => 0.5,
      request: async (input) => {
        calls += 1
        if (shouldFail) throw graphQLError('FORBIDDEN')
        return response(input)
      },
    })
    await runtime.start()
    await runtime.enqueue({
      chatId: 'chat-1',
      clientId: 'client-1',
      content: { text: 'Hello' },
      createdAt: 1000,
    })
    await waitFor(() => store.getState().messagesByChat['chat-1']?.[0]?.status === 'failed')
    runtime.wake()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(calls).toBe(1)
    expect((await repository.listOutbox('user-1')).records[0]).toMatchObject({
      state: 'failed',
      lastErrorCode: 'FORBIDDEN',
      nextAttemptAt: Number.MAX_SAFE_INTEGER,
    })

    shouldFail = false
    expect(await runtime.retry('chat-1', 'client-1')).toBe(true)
    await waitFor(() => store.getState().messagesByChat['chat-1']?.[0]?.id === 'message-1')
    expect(calls).toBe(2)
    runtime.stop()
  })

  // @anchor INV:durable-messaging/isolates-accounts
  test('does not expose or send records belonging to another account', async () => {
    const repository = createMemoryRepository()
    await repository.putDraft({
      userId: 'user-1',
      chatId: 'chat-1',
      text: 'Alice private draft',
      updatedAt: 1,
    })
    await repository.putOutbox(outboxRecord())
    const store = createChatStore()
    store.getState().setSession(session('user-2'))
    let calls = 0
    const runtime = createDurableMessaging({
      store,
      repository,
      broadcast: false,
      request: async (input) => {
        calls += 1
        return response(input)
      },
    })
    await runtime.start()

    expect(store.getState().draftsByChat).toEqual({})
    expect(store.getState().messagesByChat).toEqual({})
    expect(calls).toBe(0)
    expect((await repository.listOutbox('user-1')).records).toHaveLength(1)
    runtime.stop()
  })

  test('ignores a late response from the previous account', async () => {
    const repository = createMemoryRepository()
    const store = createChatStore()
    store.getState().setSession(session('user-1'))
    let release: ((message: Message) => void) | undefined
    const first = createDurableMessaging({
      store,
      repository,
      broadcast: false,
      request: () => new Promise<Message>((resolve) => (release = resolve)),
    })
    await first.start()
    await first.enqueue({
      chatId: 'chat-1',
      clientId: 'client-1',
      content: { text: 'Old account' },
      createdAt: 1000,
    })
    await waitFor(() => release !== undefined)
    first.stop()

    store.getState().setSession(session('user-2'))
    const second = createDurableMessaging({
      store,
      repository,
      broadcast: false,
      request: async (input) => response(input),
    })
    await second.start()
    release?.(response({ chatId: 'chat-1', content: { text: 'Old account' } }))
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(store.getState().user?.id).toBe('user-2')
    expect(store.getState().messagesByChat).toEqual({})
    expect((await repository.listOutbox('user-1')).records).toEqual([])
    second.stop()
  })
})
