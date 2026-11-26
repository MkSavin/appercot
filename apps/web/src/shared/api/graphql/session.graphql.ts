import { graphql } from './generated/gql'

export const SessionDocument = graphql(`
  query Session {
    session {
      user {
        id
        username
        displayName
        bio
        twoFactorEnabled
        role
      }
      chats {
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
        preview {
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
        createdAt
        commands {
          name
          description
          shortcut
        }
      }
      vapidPublicKey
      botWebSocketUrl
      checkpoint
    }
  }
`)

export const LoginDocument = graphql(`
  mutation Login($username: String!, $password: String!, $otp: String) {
    login(username: $username, password: $password, otp: $otp) {
      user {
        id
        username
        displayName
        bio
        twoFactorEnabled
        role
      }
      chats {
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
        preview {
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
        createdAt
        commands {
          name
          description
          shortcut
        }
      }
      vapidPublicKey
      botWebSocketUrl
      checkpoint
    }
  }
`)

export const RegisterDocument = graphql(`
  mutation Register(
    $username: String!
    $password: String!
    $displayName: String!
    $invite: String!
  ) {
    register(
      username: $username
      password: $password
      displayName: $displayName
      invite: $invite
    ) {
      user {
        id
        username
        displayName
        bio
        twoFactorEnabled
        role
      }
      chats {
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
        preview {
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
        createdAt
        commands {
          name
          description
          shortcut
        }
      }
      vapidPublicKey
      botWebSocketUrl
      checkpoint
    }
  }
`)

export const LogoutDocument = graphql(`
  mutation Logout($pushEndpoint: String) {
    logout(pushEndpoint: $pushEndpoint)
  }
`)
