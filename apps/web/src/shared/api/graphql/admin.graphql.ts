import { graphql } from './generated/gql'

export const AdminUsersDocument = graphql(`
  query AdminUsers($query: String) {
    adminUsers(query: $query) {
      id
      username
      displayName
      role
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
      role
      expiresAt
      revokedAt
    }
  }
`)

export const CreateInviteDocument = graphql(`
  mutation CreateInvite($maxUses: Int, $expiresInDays: Int, $role: InviteRole) {
    createInvite(maxUses: $maxUses, expiresInDays: $expiresInDays, role: $role) {
      code
      uses
      maxUses
      url
      role
      expiresAt
      revokedAt
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
      stopped
      listed
      access
      memberCount
      avatar
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
        stopped
        listed
        access
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
        stopped
        listed
        access
      }
      token
    }
  }
`)

export const SetBotStoppedDocument = graphql(`
  mutation SetBotStopped($botId: ID!, $stopped: Boolean!) {
    setBotStopped(botId: $botId, stopped: $stopped) {
      id username name description online stopped listed access memberCount avatar welcome guestAccess tags
    }
  }
`)

export const DeleteBotDocument = graphql(`
  mutation DeleteBot($botId: ID!) {
    deleteBot(botId: $botId)
  }
`)

export const SetBotOwnerDocument = graphql(`
  mutation SetBotOwner($botId: ID!, $username: String) {
    setBotOwner(botId: $botId, username: $username)
  }
`)

export const SetUserRoleDocument = graphql(`
  mutation SetUserRole($userId: ID!, $role: PlatformRole!) {
    setUserRole(userId: $userId, role: $role) { id username displayName role }
  }
`)

export const SetBotAccessDocument = graphql(`
  mutation SetBotAccess($botId: ID!, $access: BotAccess!) {
    setBotAccess(botId: $botId, access: $access) {
      id username name description online stopped listed access guestAccess
    }
  }
`)

export const IssueBotInviteDocument = graphql(`
  mutation IssueBotInvite($botId: ID!, $roles: [String!], $maxUses: Int, $expiresInDays: Int) {
    issueBotInvite(botId: $botId, roles: $roles, maxUses: $maxUses, expiresInDays: $expiresInDays) {
      id url expiresAt revokedAt uses maxUses roles
    }
  }
`)

export const AdminBotDiagnosticsDocument = graphql(`
  query AdminBotDiagnostics($botId: ID!) {
    adminBotDiagnostics(botId: $botId) {
      online
      connectedAt
      disconnectedAt
      lastActivityAt
      lastErrorCode
      lastErrorAt
      pendingEvents
    }
  }
`)

export const AdminBotDocument = graphql(`
  query AdminBot($botId: ID!) {
    adminBot(botId: $botId) { id username name description online stopped listed access memberCount avatar welcome guestAccess tags }
  }
`)

export const InviteBotMemberDocument = graphql(`
  mutation InviteBotMember($botId: ID!, $username: String!, $roles: [String!]!) {
    inviteBotMember(botId: $botId, username: $username, roles: $roles)
  }
`)

export const RevokeBotInviteDocument = graphql(`
  mutation RevokeBotInvite($botId: ID!, $id: ID!) {
    revokeBotInvite(botId: $botId, id: $id)
  }
`)

export const BotInvitationsDocument = graphql(`
  query BotInvitations($botId: ID!) {
    botInvitations(botId: $botId) { id url expiresAt revokedAt uses maxUses roles }
  }
`)

export const EditBotInviteDocument = graphql(`
  mutation EditBotInvite($botId: ID!, $id: ID!, $roles: [String!]!, $maxUses: Int, $expiresInDays: Int) {
    editBotInvite(botId: $botId, id: $id, roles: $roles, maxUses: $maxUses, expiresInDays: $expiresInDays) {
      id url expiresAt revokedAt uses maxUses roles
    }
  }
`)

export const EditPlatformInviteDocument = graphql(`
  mutation EditPlatformInvite($code: String!, $role: InviteRole, $maxUses: Int, $expiresInDays: Int) {
    editPlatformInvite(code: $code, role: $role, maxUses: $maxUses, expiresInDays: $expiresInDays) {
      code url expiresAt revokedAt uses maxUses role
    }
  }
`)

export const RevokePlatformInviteDocument = graphql(`
  mutation RevokePlatformInvite($code: String!) { revokePlatformInvite(code: $code) }
`)

export const BotMembershipsDocument = graphql(`
  query BotMemberships($botId: ID!) {
    botMemberships(botId: $botId) {
      roles
      roleDefinitions { code name virtual }
      members { chatId username displayName revoked roles }
    }
  }
`)

export const SetBotMemberRolesDocument = graphql(`
  mutation SetBotMemberRoles($botId: ID!, $chatId: ID!, $roles: [String!]!) {
    setBotMemberRoles(botId: $botId, chatId: $chatId, roles: $roles)
  }
`)

export const SetBotMemberRevokedDocument = graphql(`
  mutation SetBotMemberRevoked($botId: ID!, $chatId: ID!, $revoked: Boolean!) {
    setBotMemberRevoked(botId: $botId, chatId: $chatId, revoked: $revoked)
  }
`)
