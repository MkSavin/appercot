import {
  AdminUserDocument,
  BeginTotpDocument,
  ChangePasswordDocument,
  DeleteMyAccountDocument,
  DisableTotpDocument,
  EnableTotpDocument,
  graphqlClient,
  MySessionsDocument,
  ResetUserPasswordDocument,
  RevokeMyOtherSessionsDocument,
  RevokeMySessionDocument,
  UpdateAdminUserDocument,
  UpdateProfileDocument,
} from '@/shared/api'

type Profile = { displayName: string; username: string; bio: string }
type Proof = { password: string; otp?: string }
export const fetchAdminUser = async (userId: string) =>
  (await graphqlClient.request(AdminUserDocument, { userId })).adminUser
export const saveProfile = async (profile: Profile, userId?: string) =>
  userId
    ? (await graphqlClient.request(UpdateAdminUserDocument, { ...profile, userId })).updateAdminUser
    : (await graphqlClient.request(UpdateProfileDocument, profile)).updateProfile
export const changePassword = (input: Proof & { newPassword: string }) =>
  graphqlClient.request(ChangePasswordDocument, input)
export const resetUserPassword = (userId: string, newPassword: string) =>
  graphqlClient.request(ResetUserPasswordDocument, { userId, newPassword })
export const beginTotp = async (password: string) =>
  (await graphqlClient.request(BeginTotpDocument, { password })).beginTotp
export const enableTotp = async (password: string, code: string) =>
  (await graphqlClient.request(EnableTotpDocument, { password, code })).enableTotp
export const disableTotp = (password: string, otp: string) =>
  graphqlClient.request(DisableTotpDocument, { password, otp })
export const listSessions = async () => (await graphqlClient.request(MySessionsDocument)).mySessions
export const revokeSession = (id: string) => graphqlClient.request(RevokeMySessionDocument, { id })
export const revokeOtherSessions = () => graphqlClient.request(RevokeMyOtherSessionsDocument)
export const deleteAccount = (input: Proof) => graphqlClient.request(DeleteMyAccountDocument, input)
