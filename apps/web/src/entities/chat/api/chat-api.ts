import { MediaSchema } from '@appercot/protocol'
import {
  BlockBotDocument,
  ChatProfileDocument,
  ClearChatDocument,
  DeleteChatDocument,
  graphqlClient,
  MarkReadDocument,
  PressButtonDocument,
  SetChatNotificationsDocument,
} from '@/shared/api'

export const pressButtonRequest = async (variables: {
  chatId: string
  messageId: string
  data: string
}) => {
  const result = await graphqlClient.request(PressButtonDocument, variables)
  return result.pressButton
}

export const markChatReadRequest = async (variables: { chatId: string; seq: number }) => {
  const result = await graphqlClient.request(MarkReadDocument, variables)
  return result.markRead
}

export const clearChatRequest = async (variables: { chatId: string }) => {
  const result = await graphqlClient.request(ClearChatDocument, variables)
  return result.clearChat
}

export const blockBotRequest = async (variables: { chatId: string; blocked: boolean }) => {
  const result = await graphqlClient.request(BlockBotDocument, variables)
  return result.blockBot
}

export const fetchChatProfile = async (chatId: string, beforeMediaSeq?: number) => {
  const { chatProfile } = await graphqlClient.request(ChatProfileDocument, {
    chatId,
    beforeMediaSeq,
  })
  if (!Array.isArray(chatProfile.media)) throw new Error('Invalid chat profile media')
  return {
    ...chatProfile,
    media: chatProfile.media.map((item: unknown) => MediaSchema.parse(item)),
  }
}

export const deleteChatRequest = (chatId: string) =>
  graphqlClient.request(DeleteChatDocument, { chatId })

export const setChatNotificationsRequest = (chatId: string, mode: 'all' | 'silent' | 'off') =>
  graphqlClient.request(SetChatNotificationsDocument, { chatId, mode })
