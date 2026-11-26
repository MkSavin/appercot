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
      tags
    }
  }
`)

export const BrowseBotDocument = graphql(`
  query BrowseBot($botId: ID!) {
    browseBot(botId: $botId) {
      bot {
        id
        username
        name
        description
        online
        listed
        access
        avatar
        welcome
        tags
      }
      commands {
        name
        description
        shortcut
      }
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
      notificationsMutedUntil
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
