import { ClientUpdateSchema, type Message, type UserContent } from '@appercot/protocol'
import {
  graphqlClient,
  MessagesDocument,
  parseGraphqlMessage,
  SendMessageDocument,
  SyncDocument,
} from '@/shared/api'

export { parseGraphqlMessage } from '@/shared/api'

export const fetchMessages = async (chatId: string, before?: number, limit = 50) => {
  const result = await graphqlClient.request(MessagesDocument, { chatId, before, limit })
  return result.messages.map(parseGraphqlMessage)
}

export const sendMessageRequest = async (variables: {
  chatId: string
  clientId: string
  content: UserContent
}): Promise<Message> => {
  const result = await graphqlClient.request(SendMessageDocument, { input: variables })
  return parseGraphqlMessage(result.sendMessage)
}

export const fetchSynchronization = async (since: number) => {
  const result = await graphqlClient.request(SyncDocument, { since })
  return {
    resetRequired: result.sync.resetRequired,
    checkpoint: result.sync.checkpoint,
    hasMore: result.sync.hasMore,
    updates: result.sync.updates.map((update) => ({
      seq: update.seq,
      update: ClientUpdateSchema.parse(update.payload),
    })),
  }
}
