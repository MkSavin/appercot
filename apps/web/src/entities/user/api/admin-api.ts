import {
  AdminInvitesDocument,
  AdminUsersDocument,
  CreateInviteDocument,
  graphqlClient,
} from '@/shared/api'

export const fetchAdminUsers = async (query?: string) => {
  const result = await graphqlClient.request(AdminUsersDocument, { query })
  return result.adminUsers
}

export const fetchAdminInvites = async () => {
  const result = await graphqlClient.request(AdminInvitesDocument)
  return result.adminInvites
}

export const createInviteRequest = async (variables: {
  maxUses?: number
  expiresInDays?: number
}) => {
  const result = await graphqlClient.request(CreateInviteDocument, variables)
  return result.createInvite
}
