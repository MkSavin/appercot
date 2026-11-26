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
      deleted
    }
  }
`)

export const SearchMessagesDocument = graphql(`
  query SearchMessages($chatId: ID!, $query: String!, $beforeSeq: Int, $limit: Int = 30) {
    searchMessages(chatId: $chatId, query: $query, beforeSeq: $beforeSeq, limit: $limit) {
      items {
        message {
          id
          chatId
          seq
          sender
          content
          status
          replyTo
          createdAt
          editedAt
          deleted
        }
        snippet
      }
      hasMore
    }
  }
`)

export const MessageContextDocument = graphql(`
  query MessageContext($chatId: ID!, $seq: Int!, $before: Int = 25, $after: Int = 25) {
    messageContext(chatId: $chatId, seq: $seq, before: $before, after: $after) {
      messages {
        id
        chatId
        seq
        sender
        content
        status
        replyTo
        createdAt
        editedAt
        deleted
      }
      targetSeq
      hasEarlier
      hasLater
      latestSeq
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
      deleted
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
      checkpoint
      hasMore
    }
  }
`)
