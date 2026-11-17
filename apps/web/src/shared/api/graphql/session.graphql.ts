import { graphql } from './generated/gql'

export const SessionDocument = graphql(`
  query Session {
    session {
      user {
        id
        username
        displayName
        isAdmin
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
      vapidPublicKey
    }
  }
`)

export const LoginDocument = graphql(`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      user {
        id
        username
        displayName
        isAdmin
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
      vapidPublicKey
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
        isAdmin
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
      vapidPublicKey
    }
  }
`)

export const LogoutDocument = graphql(`
  mutation Logout {
    logout
  }
`)
