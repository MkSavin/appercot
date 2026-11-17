import { graphql } from './generated/gql'

export const AdminUsersDocument = graphql(`
  query AdminUsers($query: String) {
    adminUsers(query: $query) {
      id
      username
      displayName
      isAdmin
    }
  }
`)

export const AdminInvitesDocument = graphql(`
  query AdminInvites {
    adminInvites {
      code
      uses
      maxUses
      url
    }
  }
`)

export const CreateInviteDocument = graphql(`
  mutation CreateInvite($maxUses: Int, $expiresInDays: Int) {
    createInvite(maxUses: $maxUses, expiresInDays: $expiresInDays) {
      code
      uses
      maxUses
      url
    }
  }
`)

export const AdminBotsDocument = graphql(`
  query AdminBots {
    adminBots {
      id
      username
      name
      description
      online
      listed
    }
  }
`)

export const CreateBotDocument = graphql(`
  mutation CreateBot($username: String!, $name: String!, $description: String!) {
    createBot(username: $username, name: $name, description: $description) {
      bot {
        id
        username
        name
        description
        online
        listed
      }
      token
    }
  }
`)

export const ResetBotTokenDocument = graphql(`
  mutation ResetBotToken($botId: ID!) {
    resetBotToken(botId: $botId) {
      bot {
        id
        username
        name
        description
        online
        listed
      }
      token
    }
  }
`)

export const SetBotOwnerDocument = graphql(`
  mutation SetBotOwner($botId: ID!, $username: String) {
    setBotOwner(botId: $botId, username: $username)
  }
`)

export const SetBotListedDocument = graphql(`
  mutation SetBotListed($botId: ID!, $listed: Boolean!) {
    setBotListed(botId: $botId, listed: $listed)
  }
`)
