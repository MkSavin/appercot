import { graphql } from './generated/gql'

export const MessagesDocument = graphql(`
  query Messages($chatId: ID!, $before: Int, $limit: Int = 50) {
    messages(chatId: $chatId, before: $before, limit: $limit) {
      id
      chatId
      seq
      sender
      content
      status
      replyTo
      createdAt
      editedAt
    }
  }
`)

export const SendMessageDocument = graphql(`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      chatId
      seq
      sender
      content
      status
      replyTo
      createdAt
      editedAt
    }
  }
`)

export const SyncDocument = graphql(`
  query Sync($since: Int!) {
    sync(since: $since) {
      updates {
        seq
        payload
      }
      resetRequired
    }
  }
`)
