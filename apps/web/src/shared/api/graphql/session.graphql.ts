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
      }
      vapidPublicKey
    }
  }
`)
