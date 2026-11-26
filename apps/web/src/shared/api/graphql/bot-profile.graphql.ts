import { graphql } from './generated/gql'

export const ChatProfileDocument = graphql(`
  query ChatProfile($chatId: ID!, $beforeMediaSeq: Int) {
    chatProfile(chatId: $chatId, beforeMediaSeq: $beforeMediaSeq) {
      bot { id username name description online listed avatar welcome }
      blocked
      notifications
      notificationsMutedUntil
      media
      olderMediaBefore
    }
  }
`)
export const UpdateBotProfileDocument = graphql(`
  mutation UpdateBotProfile($botId: ID!, $description: String!, $welcome: String!, $avatar: String, $tags: [String!]) {
    updateBotProfile(botId: $botId, description: $description, welcome: $welcome, avatar: $avatar, tags: $tags) {
      id username name description online listed access avatar welcome tags
    }
  }
`)
export const SetBotGuestAccessDocument = graphql(`
  mutation SetBotGuestAccess($botId: ID!, $enabled: Boolean!) { setBotGuestAccess(botId: $botId, enabled: $enabled) { guestAccess } }
`)
export const DeleteChatDocument = graphql(`
  mutation DeleteChat($chatId: ID!) { deleteChat(chatId: $chatId) }
`)
export const SetChatNotificationsDocument = graphql(`
  mutation SetChatNotifications($chatId: ID!, $mode: ChatNotifications!) {
    setChatNotifications(chatId: $chatId, mode: $mode) {
      id
      bot { id username name description online listed avatar welcome tags }
      roles
      blocked
      notifications
      notificationsMutedUntil
      unread
      lastMessageAt
      createdAt
      commands { name description shortcut }
    }
  }
`)
export const SetChatMuteDocument = graphql(`
  mutation SetChatMute($chatId: ID!, $mutedUntil: Float) {
    setChatMute(chatId: $chatId, mutedUntil: $mutedUntil) {
      id
      bot { id username name description online listed avatar welcome tags }
      roles
      blocked
      notifications
      notificationsMutedUntil
      unread
      lastMessageAt
      createdAt
      commands { name description shortcut }
    }
  }
`)
