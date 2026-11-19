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
      avatar
      welcome
    }
  }
`)

export const AddBotDocument = graphql(`
  mutation AddBot($username: String!, $invite: String) {
    addBot(username: $username, invite: $invite) {
      id
      bot {
        id
        username
        name
        description
        online
        listed
        avatar
        welcome
      }
      roles
      blocked
      notifications
      unread
      lastMessageAt
      createdAt
      commands {
        name
        description
        shortcut
      }
    }
  }
`)
