import {
  AdminBotsDocument,
  CreateBotDocument,
  graphqlClient,
  ResetBotTokenDocument,
  SetBotListedDocument,
  SetBotOwnerDocument,
} from '@/shared/api'

export const fetchAdminBots = async () => {
  const result = await graphqlClient.request(AdminBotsDocument)
  return result.adminBots
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

export const setBotOwnerRequest = async (botId: string, username: string) => {
  await graphqlClient.request(SetBotOwnerDocument, { botId, username: username || null })
}

export const setBotListedRequest = async (botId: string, listed: boolean) => {
  await graphqlClient.request(SetBotListedDocument, { botId, listed })
}
