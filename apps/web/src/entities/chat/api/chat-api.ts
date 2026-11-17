import {
  BlockBotDocument,
  ClearChatDocument,
  graphqlClient,
  MarkReadDocument,
  PressButtonDocument,
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
