import type { createChatStore } from '@/entities/chat'

type Store = ReturnType<typeof createChatStore>
type BlockRequest = (variables: { chatId: string; blocked: boolean }) => Promise<boolean>

export const updateChatBlocked = async (
  store: Store,
  chatId: string,
  blocked: boolean,
  request: BlockRequest,
) => {
  await request({ chatId, blocked })
  const chat = store.getState().chats.find((current) => current.id === chatId)
  if (chat) store.getState().upsertChat({ ...chat, blocked })
}
