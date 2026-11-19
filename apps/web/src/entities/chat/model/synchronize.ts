import type { ClientUpdate, Message } from '@appercot/protocol'
import type { SessionPayload } from '@/shared/model'
import type { createChatStore } from './store'

type Store = ReturnType<typeof createChatStore>

interface SynchronizationResult {
  resetRequired: boolean
  checkpoint?: number
  hasMore?: boolean
  updates: Array<{ seq: number; update: ClientUpdate }>
}

interface SynchronizationDependencies {
  isCurrent?: () => boolean
  activeChatId?: string
  fetchUpdates: (since: number) => Promise<SynchronizationResult>
  refreshSession: () => Promise<SessionPayload>
  loadActiveChat: (chatId: string) => Promise<Message[]>
}

export const synchronizeChatState = async (
  store: Store,
  dependencies: SynchronizationDependencies,
) => {
  for (;;) {
    const since = store.getState().lastSeq
    const result = await dependencies.fetchUpdates(since)
    if (dependencies.isCurrent?.() === false) return
    if (result.resetRequired) {
      if (since === 0) throw new Error('Server cannot reset an empty checkpoint')
      const chatId = dependencies.activeChatId
      const session = await dependencies.refreshSession()
      if (dependencies.isCurrent?.() === false) return
      store.getState().setSession(session)
      if (session.checkpoint !== undefined) store.getState().discardCachedHistory()
      if (chatId && session.chats.some((chat) => chat.id === chatId)) {
        const history = await dependencies.loadActiveChat(chatId)
        if (dependencies.isCurrent?.() === false) return
        store.getState().replaceMessages(chatId, history)
      }
      store.getState().setLastSeq(session.checkpoint ?? 0)
      continue
    }
    for (const { seq, update } of result.updates) store.getState().applyUpdate(seq, update)
    if (result.checkpoint !== undefined && result.checkpoint > store.getState().lastSeq)
      store.getState().setLastSeq(result.checkpoint)
    if (!result.hasMore || store.getState().lastSeq <= since) return
  }
}
