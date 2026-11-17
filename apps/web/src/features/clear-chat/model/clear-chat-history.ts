import type { createChatStore } from '@/entities/chat'

type Store = ReturnType<typeof createChatStore>
type ClearRequest = (variables: { chatId: string }) => Promise<boolean>

export const clearChatHistory = async (store: Store, chatId: string, request: ClearRequest) => {
  await request({ chatId })
  store.getState().clearChatMessages(chatId)
}
