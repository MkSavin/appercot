import { type Message, type UserContent, UserContentSchema } from '@appercot/protocol'
import type { createChatStore } from '@/entities/chat'
import { durableMessagingFor } from './durable-messaging'
import { LocalStorageUnavailableError } from './local-records'

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
  clearDraft?: string
}

const sendInMemory = async (
  store: Store,
  input: { chatId: string; content: UserContent },
  request: SendMessageRequest,
  clientId: string,
  createdAt: number,
  clearDraft?: string,
) => {
  store.getState().beginOptimisticMessage(input.chatId, clientId, input.content, createdAt)
  if (clearDraft !== undefined && store.getState().draftsByChat[input.chatId] === clearDraft) {
    store.getState().setDraft(input.chatId, '')
  }
  try {
    const message = await request({ ...input, clientId })
    store.getState().completeOutgoingMessage(input.chatId, clientId, message)
    return message
  } catch (error) {
    store.getState().failOutgoingMessage(input.chatId, clientId)
    throw error
  }
}

export const sendChatMessage = async (
  store: Store,
  input: { chatId: string; content: UserContent },
  request: SendMessageRequest,
  options: SendOptions = {},
) => {
  const clientId = options.clientId ?? crypto.randomUUID()
  const createdAt = (options.now ?? Date.now)()
  const durable = durableMessagingFor(store)
  if (durable) {
    try {
      await durable.enqueue({
        ...input,
        clientId,
        createdAt,
        clearDraft: options.clearDraft,
      })
      return undefined
    } catch (error) {
      if (!(error instanceof LocalStorageUnavailableError)) throw error
    }
  }
  return sendInMemory(store, input, request, clientId, createdAt, options.clearDraft)
}

export const retryChatMessage = async (
  store: Store,
  chatId: string,
  clientId: string,
  request: SendMessageRequest,
) => {
  const durable = durableMessagingFor(store)
  if (durable && (await durable.retry(chatId, clientId))) return undefined
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

export const discardChatMessage = async (store: Store, chatId: string, clientId: string) => {
  const durable = durableMessagingFor(store)
  if (durable) await durable.discard(chatId, clientId)
  else store.getState().discardOutgoingMessage(chatId, clientId)
}

export const setChatDraft = (store: Store, chatId: string, text: string) => {
  const durable = durableMessagingFor(store)
  if (durable) durable.setDraft(chatId, text)
  else store.getState().setDraft(chatId, text)
}

export const flushChatDraft = async (store: Store, chatId: string) => {
  await durableMessagingFor(store)?.flushDraft(chatId)
}
