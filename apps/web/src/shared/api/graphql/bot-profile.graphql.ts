import { graphql } from './generated/gql'

export const ChatProfileDocument = graphql(`
  query ChatProfile($chatId: ID!, $beforeMediaSeq: Int) {
    chatProfile(chatId: $chatId, beforeMediaSeq: $beforeMediaSeq) {
      bot { id username name description online listed avatar welcome }
      blocked
      notifications
      media
      olderMediaBefore
    }
  }
`)
export const UpdateBotProfileDocument = graphql(`
  mutation UpdateBotProfile($botId: ID!, $description: String!, $welcome: String!, $avatar: String) {
    updateBotProfile(botId: $botId, description: $description, welcome: $welcome, avatar: $avatar) {
      id username name description online listed access avatar welcome
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
  mutation SetChatNotifications($chatId: ID!, $mode: ChatNotifications!) { setChatNotifications(chatId: $chatId, mode: $mode) }
`)
