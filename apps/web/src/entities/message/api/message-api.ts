import {
  ClientUpdateSchema,
  type Message,
  MessageSchema,
  type UserContent,
} from '@appercot/protocol'
import { graphqlClient, MessagesDocument, SendMessageDocument, SyncDocument } from '@/shared/api'
import type { MessagesQuery } from '@/shared/api/graphql/generated/graphql'

export const parseGraphqlMessage = (message: MessagesQuery['messages'][number]): Message => {
  const { replyTo, editedAt, ...requiredFields } = message
  return MessageSchema.parse({
    ...requiredFields,
    ...(replyTo === null ? {} : { replyTo }),
    ...(editedAt === null ? {} : { editedAt }),
  })
}

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
    updates: result.sync.updates.map((update) => ({
      seq: update.seq,
      update: ClientUpdateSchema.parse(update.payload),
    })),
  }
}
