import { type Message, type UserContent, UserContentSchema } from '@appercot/protocol'
import type { createChatStore } from '@/entities/chat'

export interface SendMessageVariables {
  chatId: string
  clientId: string
  content: UserContent
}

export type SendMessageRequest = (variables: SendMessageVariables) => Promise<Message>
type Store = ReturnType<typeof createChatStore>

interface SendOptions {
  clientId?: string
  now?: () => number
}

export const sendChatMessage = async (
  store: Store,
  input: { chatId: string; content: UserContent },
  request: SendMessageRequest,
  options: SendOptions = {},
) => {
  const clientId = options.clientId ?? crypto.randomUUID()
  const createdAt = (options.now ?? Date.now)()
  store.getState().beginOptimisticMessage(input.chatId, clientId, input.content, createdAt)
  try {
    const message = await request({ ...input, clientId })
    store.getState().completeOutgoingMessage(input.chatId, clientId, message)
    return message
  } catch (error) {
    store.getState().failOutgoingMessage(input.chatId, clientId)
    throw error
  }
}

export const retryChatMessage = async (
  store: Store,
  chatId: string,
  clientId: string,
  request: SendMessageRequest,
) => {
  const optimistic = store
    .getState()
    .messagesByChat[chatId]?.find((message) => message.clientId === clientId)
  if (!optimistic) throw new Error('The message is no longer available')
  const content = UserContentSchema.parse(optimistic.content)
  store.getState().retryOutgoingMessage(chatId, clientId)
  try {
    const message = await request({ chatId, clientId, content })
    store.getState().completeOutgoingMessage(chatId, clientId, message)
    return message
  } catch (error) {
    store.getState().failOutgoingMessage(chatId, clientId)
    throw error
  }
}
