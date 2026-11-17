import { graphql } from './generated/gql'

export const BrowseBotsDocument = graphql(`
  query BrowseBots($query: String) {
    browseBots(query: $query) {
      id
      username
      name
      description
      online
      listed
    }
  }
`)

export const AddBotDocument = graphql(`
  mutation AddBot($username: String!) {
    addBot(username: $username) {
      id
      bot {
        id
        username
        name
        description
        online
        listed
      }
      roles
      blocked
      unread
      lastMessageAt
      createdAt
      commands {
        name
        description
      }
    }
  }
`)
