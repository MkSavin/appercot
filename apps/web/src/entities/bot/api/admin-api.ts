import type { BotAccess } from '@appercot/protocol'
import {
  AdminBotDiagnosticsDocument,
  AdminBotDocument,
  AdminBotsDocument,
  BotInvitationsDocument,
  BotMembershipsDocument,
  CreateBotDocument,
  DeleteBotDocument,
  EditBotInviteDocument,
  graphqlClient,
  InviteBotMemberDocument,
  IssueBotInviteDocument,
  ResetBotTokenDocument,
  RevokeBotInviteDocument,
  SetBotAccessDocument,
  SetBotGuestAccessDocument,
  SetBotMemberRevokedDocument,
  SetBotMemberRolesDocument,
  SetBotOwnerDocument,
  SetBotStoppedDocument,
  UpdateBotProfileDocument,
} from '@/shared/api'

export const fetchAdminBots = async () => {
  const result = await graphqlClient.request(AdminBotsDocument)
  return result.adminBots
}

export const fetchAdminBot = async (botId: string) => {
  const result = await graphqlClient.request(AdminBotDocument, { botId })
  return result.adminBot
}

export const fetchAdminBotDiagnostics = async (botId: string) => {
  const result = await graphqlClient.request(AdminBotDiagnosticsDocument, { botId })
  return result.adminBotDiagnostics
}

export const createBotRequest = async (variables: {
  username: string
  name: string
  description: string
}) => {
  const result = await graphqlClient.request(CreateBotDocument, variables)
  return result.createBot
}

export const resetBotTokenRequest = async (botId: string) => {
  const result = await graphqlClient.request(ResetBotTokenDocument, { botId })
  return result.resetBotToken
}

export const setBotStoppedRequest = async (botId: string, stopped: boolean) => {
  const result = await graphqlClient.request(SetBotStoppedDocument, { botId, stopped })
  return result.setBotStopped
}

export const deleteBotRequest = async (botId: string) => {
  const result = await graphqlClient.request(DeleteBotDocument, { botId })
  return result.deleteBot
}

export const setBotOwnerRequest = async (botId: string, username: string) => {
  await graphqlClient.request(SetBotOwnerDocument, { botId, username: username || null })
}

export const setBotAccessRequest = async (botId: string, access: BotAccess) => {
  const result = await graphqlClient.request(SetBotAccessDocument, { botId, access })
  return result.setBotAccess
}

export const issueBotInviteRequest = async (
  botId: string,
  roles: string[],
  limits: { maxUses?: number | null; expiresInDays?: number | null },
) => {
  const result = await graphqlClient.request(IssueBotInviteDocument, { botId, roles, ...limits })
  return result.issueBotInvite
}

export const inviteBotMemberRequest = async (botId: string, username: string, roles: string[]) => {
  await graphqlClient.request(InviteBotMemberDocument, { botId, username, roles })
}

export const revokeBotInviteRequest = async (botId: string, id: string) => {
  await graphqlClient.request(RevokeBotInviteDocument, { botId, id })
}

export const fetchBotInvitations = async (botId: string) =>
  (await graphqlClient.request(BotInvitationsDocument, { botId })).botInvitations
export const editBotInviteRequest = async (
  botId: string,
  id: string,
  roles: string[],
  limits: { maxUses?: number | null; expiresInDays?: number | null },
) =>
  (await graphqlClient.request(EditBotInviteDocument, { botId, id, roles, ...limits }))
    .editBotInvite
export const updateBotProfileRequest = async (
  botId: string,
  profile: { description: string; welcome: string; avatar?: string | null; tags?: string[] },
) => (await graphqlClient.request(UpdateBotProfileDocument, { botId, ...profile })).updateBotProfile
export const setBotGuestAccessRequest = async (botId: string, enabled: boolean) =>
  (await graphqlClient.request(SetBotGuestAccessDocument, { botId, enabled })).setBotGuestAccess

export const fetchBotMemberships = async (botId: string) => {
  const result = await graphqlClient.request(BotMembershipsDocument, { botId })
  return result.botMemberships
}

export const setBotMemberRolesRequest = async (botId: string, chatId: string, roles: string[]) => {
  await graphqlClient.request(SetBotMemberRolesDocument, { botId, chatId, roles })
}

export const setBotMemberRevokedRequest = async (
  botId: string,
  chatId: string,
  revoked: boolean,
) => {
  await graphqlClient.request(SetBotMemberRevokedDocument, { botId, chatId, revoked })
}
