import { type ClientChat, MediaSchema } from '@appercot/protocol'
import {
  BlockBotDocument,
  ChatProfileDocument,
  DeleteChatDocument,
  graphqlClient,
  MarkReadDocument,
  PressButtonDocument,
  SetChatMuteDocument,
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

const normalizeConnection = (
  connection: Omit<ClientChat, 'commands'> & {
    commands: Array<{ name: string; description: string; shortcut: string | null }>
  },
): ClientChat => ({
  ...connection,
  commands: connection.commands.map(({ shortcut, ...command }) => ({
    ...command,
    shortcut: shortcut ?? undefined,
  })),
})

export const setChatNotificationsRequest = async (
  chatId: string,
  mode: 'all' | 'silent' | 'off',
) => {
  const result = await graphqlClient.request(SetChatNotificationsDocument, { chatId, mode })
  return normalizeConnection(result.setChatNotifications)
}

export const setChatMuteRequest = async (chatId: string, mutedUntil: number | null) => {
  const result = await graphqlClient.request(SetChatMuteDocument, { chatId, mutedUntil })
  return normalizeConnection(result.setChatMute)
}
