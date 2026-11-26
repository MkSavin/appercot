import {
  type Message,
  MessageSchema,
  type UserContent,
  UserContentSchema,
} from '@appercot/protocol'
import type { createChatStore } from '@/entities/chat'
import { i18n } from '@/shared/config'
import { toast } from '@/shared/lib/toast'
import { createIndexedDbRepository } from './indexeddb-repository'
import type { DraftRecord } from './local-records'
import {
  DraftRecordSchema,
  type LocalMessageRepository,
  LocalStorageUnavailableError,
  type OutboxRecord,
  OutboxRecordSchema,
} from './local-records'
import { classifyOutboxError, outboxRetryDelay } from './retry-policy'

type Store = ReturnType<typeof createChatStore>
type Request = (variables: {
  chatId: string
  clientId: string
  content: UserContent
}) => Promise<Message>

type Warning = 'storageUnavailable' | 'corruptedRecords' | 'unsentRestored' | 'updateAvailable'

export interface EnqueueInput {
  chatId: string
  clientId: string
  content: UserContent
  createdAt: number
  clearDraft?: string
}

export interface DurableMessaging {
  userId: string
  start: () => Promise<void>
  stop: () => void
  enqueue: (input: EnqueueInput) => Promise<void>
  setDraft: (chatId: string, text: string) => void
  flushDraft: (chatId: string) => Promise<void>
  retry: (chatId: string, clientId: string) => Promise<boolean>
  discard: (chatId: string, clientId: string) => Promise<void>
  wake: () => void
  whenIdle: () => Promise<void>
}

interface DurableMessagingOptions {
  store: Store
  request: Request
  repository: LocalMessageRepository
  now?: () => number
  random?: () => number
  onWarning?: (warning: Warning, count?: number) => void
  broadcast?: boolean
}

const maximumAutomaticAttempts = 5
const recordKey = (chatId: string, clientId: string) => JSON.stringify([chatId, clientId])
const byFifo = (left: OutboxRecord, right: OutboxRecord) =>
  left.createdAt - right.createdAt || left.clientId.localeCompare(right.clientId)

type ChannelMessage =
  | { type: 'draft'; draft: DraftRecord }
  | { type: 'outbox'; record: OutboxRecord }
  | { type: 'complete'; chatId: string; clientId: string; message: Message }
  | { type: 'delete'; chatId: string; clientId: string }
  | { type: 'chat-delete'; chatId: string }

const parseChannelMessage = (value: unknown): ChannelMessage | undefined => {
  if (typeof value !== 'object' || value === null || !('type' in value)) return undefined
  if (value.type === 'draft' && 'draft' in value) {
    const draft = DraftRecordSchema.safeParse(value.draft)
    return draft.success ? { type: 'draft', draft: draft.data } : undefined
  }
  if (value.type === 'outbox' && 'record' in value) {
    const record = OutboxRecordSchema.safeParse(value.record)
    return record.success ? { type: 'outbox', record: record.data } : undefined
  }
  if (
    (value.type === 'complete' || value.type === 'delete') &&
    'chatId' in value &&
    'clientId' in value &&
    typeof value.chatId === 'string' &&
    value.chatId &&
    typeof value.clientId === 'string' &&
    value.clientId
  ) {
    if (value.type === 'delete') {
      return { type: 'delete', chatId: value.chatId, clientId: value.clientId }
    }
    if (!('message' in value)) return undefined
    const message = MessageSchema.safeParse(value.message)
    if (!message.success || message.data.chatId !== value.chatId) return undefined
    return {
      type: 'complete',
      chatId: value.chatId,
      clientId: value.clientId,
      message: message.data,
    }
  }
  if (value.type === 'chat-delete' && 'chatId' in value && typeof value.chatId === 'string') {
    return value.chatId ? { type: 'chat-delete', chatId: value.chatId } : undefined
  }
  return undefined
}

const showWarning: NonNullable<DurableMessagingOptions['onWarning']> = (warning, count = 0) => {
  const keys: Record<Warning, string> = {
    storageUnavailable: 'errors:storageUnavailable',
    corruptedRecords: 'errors:corruptedRecords',
    unsentRestored: 'chat:unsentRestored',
    updateAvailable: 'errors:storageUpdateBlocked',
  }
  toast.warning(i18n.t(keys[warning], { count }), { toasterId: 'appercot' })
}

export const createDurableMessaging = (options: DurableMessagingOptions): DurableMessaging => {
  const { store, request, repository } = options
  const userId = store.getState().user?.id
  if (!userId) throw new Error('An authenticated session is required')
  const now = options.now ?? Date.now
  const random = options.random ?? Math.random
  const onWarning = options.onWarning ?? showWarning
  const records = new Map<string, OutboxRecord>()
  const chatPumps = new Map<string, Promise<void>>()
  const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const draftTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const editedDrafts = new Set<string>()
  const warnings = new Set<Warning>()
  let active = false
  let available = true
  let hydrated = false
  let paused = false
  let ready = Promise.resolve()
  let channel: BroadcastChannel | undefined

  const isCurrent = () => active && store.getState().user?.id === userId
  const warn = (warning: Warning, count?: number) => {
    if (warnings.has(warning)) return
    warnings.add(warning)
    onWarning(warning, count)
  }
  const notify = (message: ChannelMessage) => {
    try {
      channel?.postMessage(message)
    } catch {
      return
    }
  }
  const degrade = () => {
    available = false
    warn('storageUnavailable')
  }

  const restoreRecord = (record: OutboxRecord) => {
    records.set(recordKey(record.chatId, record.clientId), record)
    if (!store.getState().chats.some((chat) => chat.id === record.chatId)) return
    store
      .getState()
      .beginOptimisticMessage(record.chatId, record.clientId, record.content, record.createdAt)
    if (record.state === 'failed') {
      store.getState().failOutgoingMessage(record.chatId, record.clientId)
    } else {
      store.getState().retryOutgoingMessage(record.chatId, record.clientId)
    }
  }

  const scheduleRetry = (chatId: string, at: number) => {
    if (!isCurrent() || retryTimers.has(chatId)) return
    const delay = Math.min(Math.max(0, at - now()), 2_147_483_647)
    const timer = setTimeout(() => {
      retryTimers.delete(chatId)
      void pumpChat(chatId)
    }, delay)
    retryTimers.set(chatId, timer)
  }

  const refreshChat = async (chatId: string) => {
    const batch = await repository.listOutbox(userId)
    if (batch.corrupted) warn('corruptedRecords', batch.corrupted)
    const fresh = batch.records.filter((record) => record.chatId === chatId)
    for (const key of [...records.keys()]) {
      const record = records.get(key)
      if (record?.chatId === chatId) records.delete(key)
    }
    for (const record of fresh) records.set(recordKey(chatId, record.clientId), record)
    return fresh.sort(byFifo)
  }

  const processChat = async (chatId: string) => {
    while (isCurrent() && available && !paused) {
      if (!store.getState().chats.some((chat) => chat.id === chatId)) return
      const fresh = await refreshChat(chatId)
      const record = fresh[0]
      if (!record) return
      if (record.state === 'sending') return
      if (record.state === 'failed') {
        const failure = classifyOutboxError(
          Object.assign(new Error(record.lastErrorCode), { code: record.lastErrorCode }),
        )
        if (failure.kind === 'permanent' || record.nextAttemptAt === Number.MAX_SAFE_INTEGER) {
          return
        }
        if (record.nextAttemptAt > now()) {
          scheduleRetry(chatId, record.nextAttemptAt)
          return
        }
      }
      const sending: OutboxRecord = {
        ...record,
        state: 'sending',
        attempts: record.attempts + 1,
        updatedAt: now(),
      }
      await repository.putOutbox(sending)
      records.set(recordKey(chatId, sending.clientId), sending)
      if (isCurrent()) store.getState().retryOutgoingMessage(chatId, sending.clientId)
      notify({ type: 'outbox', record: sending })
      try {
        const message = await request({
          chatId,
          clientId: sending.clientId,
          content: sending.content,
        })
        await repository.deleteOutbox(userId, chatId, sending.clientId)
        records.delete(recordKey(chatId, sending.clientId))
        if (isCurrent()) {
          store.getState().completeOutgoingMessage(chatId, sending.clientId, message)
        }
        notify({ type: 'complete', chatId, clientId: sending.clientId, message })
      } catch (error) {
        const failure = classifyOutboxError(error, now())
        const retryExhausted =
          failure.kind === 'transient' && sending.attempts >= maximumAutomaticAttempts
        const failed: OutboxRecord = {
          ...sending,
          state: 'failed',
          lastErrorCode: retryExhausted ? 'MAX_ATTEMPTS' : failure.code,
          nextAttemptAt:
            failure.kind === 'permanent' || retryExhausted
              ? Number.MAX_SAFE_INTEGER
              : now() + outboxRetryDelay(failure, sending.attempts, random),
          updatedAt: now(),
        }
        await repository.putOutbox(failed)
        records.set(recordKey(chatId, failed.clientId), failed)
        if (isCurrent()) store.getState().failOutgoingMessage(chatId, failed.clientId)
        notify({ type: 'outbox', record: failed })
        if (failure.kind === 'unauthorized') paused = true
        else if (failure.kind === 'transient' && !retryExhausted) {
          scheduleRetry(chatId, failed.nextAttemptAt)
        }
        return
      }
    }
  }

  const withChatLock = (chatId: string, task: () => Promise<void>) => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(`appercot:outbox:${userId}:${chatId}`, task)
    }
    return task()
  }

  const pumpChat = async (chatId: string) => {
    if (!isCurrent() || !available || paused || !hydrated || chatPumps.has(chatId)) return
    const pump = withChatLock(chatId, () => processChat(chatId))
      .catch((error) => {
        if (isCurrent()) store.getState().setConnection('offline')
        if (error instanceof LocalStorageUnavailableError) degrade()
      })
      .finally(() => {
        chatPumps.delete(chatId)
      })
    chatPumps.set(chatId, pump)
    await pump
  }

  const wake = () => {
    if (!isCurrent() || !available || paused || !hydrated) return
    const chatIds = new Set([...records.values()].map((record) => record.chatId))
    for (const chatId of chatIds) void pumpChat(chatId)
  }

  const hydrate = async () => {
    try {
      const [draftBatch, outboxBatch] = await Promise.all([
        repository.listDrafts(userId),
        repository.listOutbox(userId),
      ])
      if (!isCurrent()) return
      const corrupted = draftBatch.corrupted + outboxBatch.corrupted
      if (corrupted) warn('corruptedRecords', corrupted)
      for (const draft of draftBatch.records) {
        if (!editedDrafts.has(draft.chatId)) store.getState().setDraft(draft.chatId, draft.text)
      }
      for (const chatId of editedDrafts) void flushDraft(chatId)
      for (const stored of outboxBatch.records.sort(byFifo)) {
        const record =
          stored.state === 'sending'
            ? { ...stored, state: 'queued' as const, updatedAt: now() }
            : stored
        if (record !== stored) await repository.putOutbox(record)
        if (isCurrent()) restoreRecord(record)
      }
      hydrated = true
      if (outboxBatch.records.length) warn('unsentRestored', outboxBatch.records.length)
      wake()
    } catch (error) {
      if (error instanceof LocalStorageUnavailableError) degrade()
      else throw error
    }
  }

  const persistDraft = async (chatId: string) => {
    if (!available) return
    const text = store.getState().draftsByChat[chatId] ?? ''
    try {
      if (text) await repository.putDraft({ userId, chatId, text, updatedAt: now() })
      else await repository.deleteDraft(userId, chatId)
      if (!draftTimers.has(chatId)) editedDrafts.delete(chatId)
      notify({ type: 'draft', draft: { userId, chatId, text, updatedAt: now() } })
    } catch (error) {
      if (error instanceof LocalStorageUnavailableError) degrade()
      else throw error
    }
  }

  const flushDraft = async (chatId: string) => {
    const timer = draftTimers.get(chatId)
    if (timer) clearTimeout(timer)
    draftTimers.delete(chatId)
    await persistDraft(chatId)
  }

  const setDraft = (chatId: string, text: string) => {
    if (!isCurrent()) return
    store.getState().setDraft(chatId, text)
    editedDrafts.add(chatId)
    const previous = draftTimers.get(chatId)
    if (previous) clearTimeout(previous)
    draftTimers.set(
      chatId,
      setTimeout(() => void flushDraft(chatId), 250),
    )
  }

  const discardChat = async (chatId: string) => {
    const timer = retryTimers.get(chatId)
    if (timer) clearTimeout(timer)
    retryTimers.delete(chatId)
    for (const [key, record] of records) {
      if (record.chatId === chatId) records.delete(key)
    }
    try {
      await repository.deleteChat(userId, chatId)
      notify({ type: 'chat-delete', chatId })
    } catch (error) {
      if (error instanceof LocalStorageUnavailableError) degrade()
      else throw error
    }
  }

  const receive = (event: MessageEvent<unknown>) => {
    const message = parseChannelMessage(event.data)
    if (!message || !isCurrent()) return
    if (message.type === 'draft') {
      if (message.draft.userId !== userId) return
      if (!editedDrafts.has(message.draft.chatId)) {
        store.getState().setDraft(message.draft.chatId, message.draft.text)
      }
    } else if (message.type === 'outbox') {
      if (message.record.userId !== userId) return
      restoreRecord(message.record)
      if (message.record.state === 'queued') wake()
    } else if (message.type === 'complete') {
      records.delete(recordKey(message.chatId, message.clientId))
      store.getState().completeOutgoingMessage(message.chatId, message.clientId, message.message)
    } else if (message.type === 'delete') {
      records.delete(recordKey(message.chatId, message.clientId))
      store.getState().discardOutgoingMessage(message.chatId, message.clientId)
    } else {
      for (const [key, record] of records) {
        if (record.chatId === message.chatId) records.delete(key)
      }
    }
  }

  const handleOnline = () => wake()
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') wake()
  }
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.user?.id !== userId || previous.user?.id !== userId) return
    if (state.connection === 'online' && previous.connection !== 'online') wake()
    for (const chat of previous.chats) {
      if (!state.chats.some((current) => current.id === chat.id)) void discardChat(chat.id)
    }
  })

  const start = () => {
    if (active) return ready
    active = true
    if (options.broadcast !== false && typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(`appercot:outbox:${userId}`)
      channel.onmessage = receive
    }
    if (typeof window !== 'undefined') window.addEventListener('online', handleOnline)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
    }
    ready = hydrate()
    return ready
  }

  const stop = () => {
    if (!active) return
    for (const chatId of draftTimers.keys()) void flushDraft(chatId)
    active = false
    for (const timer of draftTimers.values()) clearTimeout(timer)
    for (const timer of retryTimers.values()) clearTimeout(timer)
    draftTimers.clear()
    retryTimers.clear()
    unsubscribe()
    channel?.close()
    channel = undefined
    if (typeof window !== 'undefined') window.removeEventListener('online', handleOnline)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
    repository.close()
  }

  return {
    userId,
    start,
    stop,
    enqueue: async (input) => {
      await ready
      if (!isCurrent()) throw new Error('The session ended before the message was queued')
      if (!available) throw new LocalStorageUnavailableError()
      const record: OutboxRecord = {
        userId,
        chatId: input.chatId,
        clientId: input.clientId,
        content: UserContentSchema.parse(input.content),
        createdAt: input.createdAt,
        state: 'queued',
        attempts: 0,
        nextAttemptAt: 0,
        updatedAt: now(),
      }
      try {
        await repository.enqueueOutbox(record, input.clearDraft)
      } catch (error) {
        if (error instanceof LocalStorageUnavailableError) degrade()
        throw error
      }
      if (!isCurrent()) return
      records.set(recordKey(input.chatId, input.clientId), record)
      store
        .getState()
        .beginOptimisticMessage(input.chatId, input.clientId, record.content, input.createdAt)
      if (
        input.clearDraft !== undefined &&
        store.getState().draftsByChat[input.chatId] === input.clearDraft
      ) {
        store.getState().setDraft(input.chatId, '')
        editedDrafts.delete(input.chatId)
      }
      notify({ type: 'outbox', record })
      wake()
    },
    setDraft,
    flushDraft,
    retry: async (chatId, clientId) => {
      await ready
      let record = records.get(recordKey(chatId, clientId))
      if (!record && available) {
        const batch = await repository.listOutbox(userId)
        record = batch.records.find(
          (candidate) => candidate.chatId === chatId && candidate.clientId === clientId,
        )
      }
      if (!record || !available) return false
      const queued: OutboxRecord = {
        ...record,
        state: 'queued',
        attempts: 0,
        nextAttemptAt: 0,
        updatedAt: now(),
      }
      await repository.putOutbox(queued)
      records.set(recordKey(chatId, clientId), queued)
      if (isCurrent()) store.getState().retryOutgoingMessage(chatId, clientId)
      paused = false
      notify({ type: 'outbox', record: queued })
      wake()
      return true
    },
    discard: async (chatId, clientId) => {
      if (!available) {
        if (isCurrent()) store.getState().discardOutgoingMessage(chatId, clientId)
        return
      }
      await repository.deleteOutbox(userId, chatId, clientId)
      records.delete(recordKey(chatId, clientId))
      if (isCurrent()) store.getState().discardOutgoingMessage(chatId, clientId)
      notify({ type: 'delete', chatId, clientId })
    },
    wake,
    whenIdle: async () => {
      await ready
      await Promise.all([...chatPumps.values()])
    },
  }
}

let activeMessaging: DurableMessaging | undefined

export const startDurableMessaging = (
  store: Store,
  request: Request,
  options: Partial<Omit<DurableMessagingOptions, 'store' | 'request'>> = {},
) => {
  if (!store.getState().user) return () => {}
  const repository =
    options.repository ??
    createIndexedDbRepository({ onBlocked: () => showWarning('updateAvailable') })
  const messaging = createDurableMessaging({ store, request, repository, ...options })
  activeMessaging?.stop()
  activeMessaging = messaging
  void messaging.start()
  return () => {
    if (activeMessaging === messaging) activeMessaging = undefined
    messaging.stop()
  }
}

export const durableMessagingFor = (store: Store) => {
  const userId = store.getState().user?.id
  return activeMessaging?.userId === userId ? activeMessaging : undefined
}
