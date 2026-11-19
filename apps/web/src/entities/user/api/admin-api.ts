import {
  AdminInvitesDocument,
  AdminUsersDocument,
  CreateInviteDocument,
  EditPlatformInviteDocument,
  graphqlClient,
  RevokePlatformInviteDocument,
  SetUserRoleDocument,
} from '@/shared/api'

export const setUserRoleRequest = async (userId: string, role: 'user' | 'admin') => {
  const result = await graphqlClient.request(SetUserRoleDocument, { userId, role })
  return result.setUserRole
}

export const fetchAdminUsers = async (query?: string) => {
  const result = await graphqlClient.request(AdminUsersDocument, { query })
  return result.adminUsers
}

export const fetchAdminInvites = async () => {
  const result = await graphqlClient.request(AdminInvitesDocument)
  return result.adminInvites
}

export const createInviteRequest = async (variables: {
  maxUses?: number | null
  expiresInDays?: number | null
  role?: 'user' | 'admin'
}) => {
  const result = await graphqlClient.request(CreateInviteDocument, variables)
  return result.createInvite
}

export const editPlatformInvite = async (
  code: string,
  variables: Parameters<typeof createInviteRequest>[0],
) =>
  (await graphqlClient.request(EditPlatformInviteDocument, { code, ...variables }))
    .editPlatformInvite
export const revokePlatformInvite = (code: string) =>
  graphqlClient.request(RevokePlatformInviteDocument, { code })
