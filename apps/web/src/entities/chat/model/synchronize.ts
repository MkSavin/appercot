import type { ClientUpdate, Message } from '@appercot/protocol'
import type { SessionPayload } from '@/shared/model'
import type { createChatStore } from './store'

type Store = ReturnType<typeof createChatStore>

interface SynchronizationResult {
  resetRequired: boolean
  updates: Array<{ seq: number; update: ClientUpdate }>
}

interface SynchronizationDependencies {
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
    const result = await dependencies.fetchUpdates(store.getState().lastSeq)
    if (result.resetRequired) {
      store.getState().setLastSeq(0)
      store.getState().setSession(await dependencies.refreshSession())
      if (dependencies.activeChatId) {
        const history = await dependencies.loadActiveChat(dependencies.activeChatId)
        store.getState().replaceMessages(dependencies.activeChatId, history)
      }
      continue
    }
    for (const { seq, update } of result.updates) store.getState().applyUpdate(seq, update)
    return
  }
}
