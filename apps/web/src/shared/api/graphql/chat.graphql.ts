import { graphql } from './generated/gql'

export const PressButtonDocument = graphql(`
  mutation PressButton($chatId: ID!, $messageId: ID!, $data: String!) {
    pressButton(chatId: $chatId, messageId: $messageId, data: $data) {
      toast
    }
  }
`)

export const MarkReadDocument = graphql(`
  mutation MarkRead($chatId: ID!, $seq: Int!) {
    markRead(chatId: $chatId, seq: $seq)
  }
`)

export const BlockBotDocument = graphql(`
  mutation BlockBot($chatId: ID!, $blocked: Boolean!) {
    blockBot(chatId: $chatId, blocked: $blocked)
  }
`)
