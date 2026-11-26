import type { ClientChat } from '@appercot/protocol'
import type { createChatStore } from '@/entities/chat'

type Store = ReturnType<typeof createChatStore>
type NotificationMode = 'all' | 'silent' | 'off'
type NotificationRequest = (chatId: string, mode: NotificationMode) => Promise<ClientChat>
type MuteRequest = (chatId: string, mutedUntil: number | null) => Promise<ClientChat>

const queues = new WeakMap<Store, Map<string, Promise<void>>>()

const enqueue = async (store: Store, chatId: string, request: () => Promise<ClientChat>) => {
  const userId = store.getState().user?.id
  const storeQueues = queues.get(store) ?? new Map<string, Promise<void>>()
  queues.set(store, storeQueues)
  const previous = storeQueues.get(chatId) ?? Promise.resolve()
  const operation = previous
    .catch(() => {})
    .then(async () => {
      if (!userId || store.getState().user?.id !== userId) return
      const chat = await request()
      if (store.getState().user?.id === userId) store.getState().upsertChat(chat)
    })
  storeQueues.set(chatId, operation)
  try {
    await operation
  } finally {
    if (storeQueues.get(chatId) === operation) storeQueues.delete(chatId)
  }
}

export const updateChatNotifications = (
  store: Store,
  chatId: string,
  mode: NotificationMode,
  request: NotificationRequest,
) => enqueue(store, chatId, () => request(chatId, mode))

export const updateChatMute = (
  store: Store,
  chatId: string,
  mutedUntil: number | null,
  request: MuteRequest,
) => enqueue(store, chatId, () => request(chatId, mutedUntil))
