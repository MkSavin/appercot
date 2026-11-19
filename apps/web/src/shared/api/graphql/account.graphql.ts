import { graphql } from './generated/gql'

export const UpdateProfileDocument = graphql(`
  mutation UpdateProfile($displayName: String!, $username: String!, $bio: String!) {
    updateProfile(displayName: $displayName, username: $username, bio: $bio) { id displayName username bio role twoFactorEnabled }
  }
`)
export const AdminUserDocument = graphql(`
  query AdminUser($userId: ID!) {
    adminUser(userId: $userId) { id displayName username bio role twoFactorEnabled }
  }
`)
export const UpdateAdminUserDocument = graphql(`
  mutation UpdateAdminUser($userId: ID!, $displayName: String!, $username: String!, $bio: String!) {
    updateAdminUser(userId: $userId, displayName: $displayName, username: $username, bio: $bio) { id displayName username bio role twoFactorEnabled }
  }
`)
export const ResetUserPasswordDocument = graphql(`
  mutation ResetUserPassword($userId: ID!, $newPassword: String!) {
    resetUserPassword(userId: $userId, newPassword: $newPassword)
  }
`)
export const ChangePasswordDocument = graphql(`
  mutation ChangePassword($password: String!, $newPassword: String!, $otp: String) {
    changePassword(password: $password, newPassword: $newPassword, otp: $otp)
  }
`)
export const BeginTotpDocument = graphql(`
  mutation BeginTotp($password: String!) { beginTotp(password: $password) }
`)
export const EnableTotpDocument = graphql(`
  mutation EnableTotp($password: String!, $code: String!) { enableTotp(password: $password, code: $code) }
`)
export const DisableTotpDocument = graphql(`
  mutation DisableTotp($password: String!, $otp: String!) { disableTotp(password: $password, otp: $otp) }
`)
export const MySessionsDocument = graphql(`
  query MySessions { mySessions { id current userAgent createdAt expiresAt } }
`)
export const RevokeMySessionDocument = graphql(`
  mutation RevokeMySession($id: ID!) { revokeMySession(id: $id) }
`)
export const DeleteMyAccountDocument = graphql(`
  mutation DeleteMyAccount($password: String!, $otp: String) { deleteMyAccount(password: $password, otp: $otp) }
`)
