/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type BotAccess =
  | 'by_link'
  | 'public';

export type ChatNotifications =
  | 'all'
  | 'off'
  | 'silent';

export type InviteRole =
  | 'admin'
  | 'user';

export type PlatformRole =
  | 'admin'
  | 'owner'
  | 'user';

export type SendMessageInput = {
  chatId: string | number;
  clientId: string;
  content: unknown;
};

export type UpdateProfileMutationVariables = Exact<{
  displayName: string;
  username: string;
  bio: string;
}>;


export type UpdateProfileMutation = { updateProfile: { id: string, displayName: string, username: string, bio: string, role: PlatformRole, twoFactorEnabled: boolean } };

export type AdminUserQueryVariables = Exact<{
  userId: string | number;
}>;


export type AdminUserQuery = { adminUser: { id: string, displayName: string, username: string, bio: string, role: PlatformRole, twoFactorEnabled: boolean } };

export type UpdateAdminUserMutationVariables = Exact<{
  userId: string | number;
  displayName: string;
  username: string;
  bio: string;
}>;


export type UpdateAdminUserMutation = { updateAdminUser: { id: string, displayName: string, username: string, bio: string, role: PlatformRole, twoFactorEnabled: boolean } };

export type ResetUserPasswordMutationVariables = Exact<{
  userId: string | number;
  newPassword: string;
}>;


export type ResetUserPasswordMutation = { resetUserPassword: boolean };

export type ChangePasswordMutationVariables = Exact<{
  password: string;
  newPassword: string;
  otp?: string | null | undefined;
}>;


export type ChangePasswordMutation = { changePassword: boolean };

export type BeginTotpMutationVariables = Exact<{
  password: string;
}>;


export type BeginTotpMutation = { beginTotp: string };

export type EnableTotpMutationVariables = Exact<{
  password: string;
  code: string;
}>;


export type EnableTotpMutation = { enableTotp: string };

export type DisableTotpMutationVariables = Exact<{
  password: string;
  otp: string;
}>;


export type DisableTotpMutation = { disableTotp: boolean };

export type MySessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MySessionsQuery = { mySessions: Array<{ id: string, current: boolean, userAgent: string | null, createdAt: number, expiresAt: number }> };

export type RevokeMySessionMutationVariables = Exact<{
  id: string | number;
}>;


export type RevokeMySessionMutation = { revokeMySession: boolean };

export type DeleteMyAccountMutationVariables = Exact<{
  password: string;
  otp?: string | null | undefined;
}>;


export type DeleteMyAccountMutation = { deleteMyAccount: boolean };

export type AdminUsersQueryVariables = Exact<{
  query?: string | null | undefined;
}>;


export type AdminUsersQuery = { adminUsers: Array<{ id: string, username: string, displayName: string, role: PlatformRole }> };

export type AdminInvitesQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminInvitesQuery = { adminInvites: Array<{ code: string, uses: number, maxUses: number | null, url: string, role: InviteRole, expiresAt: number | null, revokedAt: number | null }> };

export type CreateInviteMutationVariables = Exact<{
  maxUses?: number | null | undefined;
  expiresInDays?: number | null | undefined;
  role?: InviteRole | null | undefined;
}>;


export type CreateInviteMutation = { createInvite: { code: string, uses: number, maxUses: number | null, url: string, role: InviteRole, expiresAt: number | null, revokedAt: number | null } };

export type AdminBotsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminBotsQuery = { adminBots: Array<{ id: string, username: string, name: string, description: string, online: boolean, listed: boolean, access: BotAccess, memberCount: number, avatar: string | null }> };

export type CreateBotMutationVariables = Exact<{
  username: string;
  name: string;
  description: string;
}>;


export type CreateBotMutation = { createBot: { token: string, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, access: BotAccess } } };

export type ResetBotTokenMutationVariables = Exact<{
  botId: string | number;
}>;


export type ResetBotTokenMutation = { resetBotToken: { token: string, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, access: BotAccess } } };

export type SetBotOwnerMutationVariables = Exact<{
  botId: string | number;
  username?: string | null | undefined;
}>;


export type SetBotOwnerMutation = { setBotOwner: boolean };

export type SetUserRoleMutationVariables = Exact<{
  userId: string | number;
  role: PlatformRole;
}>;


export type SetUserRoleMutation = { setUserRole: { id: string, username: string, displayName: string, role: PlatformRole } };

export type SetBotAccessMutationVariables = Exact<{
  botId: string | number;
  access: BotAccess;
}>;


export type SetBotAccessMutation = { setBotAccess: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, access: BotAccess, guestAccess: boolean } };

export type IssueBotInviteMutationVariables = Exact<{
  botId: string | number;
  roles?: Array<string> | string | null | undefined;
  maxUses?: number | null | undefined;
  expiresInDays?: number | null | undefined;
}>;


export type IssueBotInviteMutation = { issueBotInvite: { id: string, url: string | null, expiresAt: number | null, revokedAt: number | null, uses: number, maxUses: number | null, roles: Array<string> } };

export type AdminBotDiagnosticsQueryVariables = Exact<{
  botId: string | number;
}>;


export type AdminBotDiagnosticsQuery = { adminBotDiagnostics: { online: boolean, connectedAt: number | null, disconnectedAt: number | null, lastActivityAt: number | null, lastErrorCode: string | null, lastErrorAt: number | null, pendingEvents: number } };

export type AdminBotQueryVariables = Exact<{
  botId: string | number;
}>;


export type AdminBotQuery = { adminBot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, access: BotAccess, memberCount: number, avatar: string | null, welcome: string, guestAccess: boolean, tags: Array<string> } };

export type InviteBotMemberMutationVariables = Exact<{
  botId: string | number;
  username: string;
  roles: Array<string> | string;
}>;


export type InviteBotMemberMutation = { inviteBotMember: boolean };

export type RevokeBotInviteMutationVariables = Exact<{
  botId: string | number;
  id: string | number;
}>;


export type RevokeBotInviteMutation = { revokeBotInvite: boolean };

export type BotInvitationsQueryVariables = Exact<{
  botId: string | number;
}>;


export type BotInvitationsQuery = { botInvitations: Array<{ id: string, url: string | null, expiresAt: number | null, revokedAt: number | null, uses: number, maxUses: number | null, roles: Array<string> }> };

export type EditBotInviteMutationVariables = Exact<{
  botId: string | number;
  id: string | number;
  roles: Array<string> | string;
  maxUses?: number | null | undefined;
  expiresInDays?: number | null | undefined;
}>;


export type EditBotInviteMutation = { editBotInvite: { id: string, url: string | null, expiresAt: number | null, revokedAt: number | null, uses: number, maxUses: number | null, roles: Array<string> } };

export type EditPlatformInviteMutationVariables = Exact<{
  code: string;
  role?: InviteRole | null | undefined;
  maxUses?: number | null | undefined;
  expiresInDays?: number | null | undefined;
}>;


export type EditPlatformInviteMutation = { editPlatformInvite: { code: string, url: string, expiresAt: number | null, revokedAt: number | null, uses: number, maxUses: number | null, role: InviteRole } };

export type RevokePlatformInviteMutationVariables = Exact<{
  code: string;
}>;


export type RevokePlatformInviteMutation = { revokePlatformInvite: boolean };

export type BotMembershipsQueryVariables = Exact<{
  botId: string | number;
}>;


export type BotMembershipsQuery = { botMemberships: { roles: Array<string>, roleDefinitions: Array<{ code: string, name: string, virtual: boolean }>, members: Array<{ chatId: string, username: string, displayName: string, revoked: boolean, roles: Array<string> }> } };

export type SetBotMemberRolesMutationVariables = Exact<{
  botId: string | number;
  chatId: string | number;
  roles: Array<string> | string;
}>;


export type SetBotMemberRolesMutation = { setBotMemberRoles: boolean };

export type SetBotMemberRevokedMutationVariables = Exact<{
  botId: string | number;
  chatId: string | number;
  revoked: boolean;
}>;


export type SetBotMemberRevokedMutation = { setBotMemberRevoked: boolean };

export type ChatProfileQueryVariables = Exact<{
  chatId: string | number;
  beforeMediaSeq?: number | null | undefined;
}>;


export type ChatProfileQuery = { chatProfile: { blocked: boolean, notifications: ChatNotifications, notificationsMutedUntil: number | null, media: unknown, olderMediaBefore: number | null, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, avatar: string | null, welcome: string } } };

export type UpdateBotProfileMutationVariables = Exact<{
  botId: string | number;
  description: string;
  welcome: string;
  avatar?: string | null | undefined;
  tags?: Array<string> | string | null | undefined;
}>;


export type UpdateBotProfileMutation = { updateBotProfile: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, access: BotAccess, avatar: string | null, welcome: string, tags: Array<string> } };

export type SetBotGuestAccessMutationVariables = Exact<{
  botId: string | number;
  enabled: boolean;
}>;


export type SetBotGuestAccessMutation = { setBotGuestAccess: { guestAccess: boolean } };

export type DeleteChatMutationVariables = Exact<{
  chatId: string | number;
}>;


export type DeleteChatMutation = { deleteChat: boolean };

export type SetChatNotificationsMutationVariables = Exact<{
  chatId: string | number;
  mode: ChatNotifications;
}>;


export type SetChatNotificationsMutation = { setChatNotifications: { id: string, roles: Array<string>, blocked: boolean, notifications: ChatNotifications, notificationsMutedUntil: number | null, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, avatar: string | null, welcome: string, tags: Array<string> }, commands: Array<{ name: string, description: string, shortcut: string | null }> } };

export type SetChatMuteMutationVariables = Exact<{
  chatId: string | number;
  mutedUntil?: number | null | undefined;
}>;


export type SetChatMuteMutation = { setChatMute: { id: string, roles: Array<string>, blocked: boolean, notifications: ChatNotifications, notificationsMutedUntil: number | null, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, avatar: string | null, welcome: string, tags: Array<string> }, commands: Array<{ name: string, description: string, shortcut: string | null }> } };

export type BrowseBotsQueryVariables = Exact<{
  query?: string | null | undefined;
}>;


export type BrowseBotsQuery = { browseBots: Array<{ id: string, username: string, name: string, description: string, online: boolean, listed: boolean, avatar: string | null, welcome: string, tags: Array<string> }> };

export type BrowseBotQueryVariables = Exact<{
  botId: string | number;
}>;


export type BrowseBotQuery = { browseBot: { bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, access: BotAccess, avatar: string | null, welcome: string, tags: Array<string> }, commands: Array<{ name: string, description: string, shortcut: string | null }> } };

export type AddBotMutationVariables = Exact<{
  username: string;
  invite?: string | null | undefined;
}>;


export type AddBotMutation = { addBot: { id: string, roles: Array<string>, blocked: boolean, notifications: ChatNotifications, notificationsMutedUntil: number | null, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, avatar: string | null, welcome: string }, commands: Array<{ name: string, description: string, shortcut: string | null }> } };

export type PressButtonMutationVariables = Exact<{
  chatId: string | number;
  messageId: string | number;
  data: string;
}>;


export type PressButtonMutation = { pressButton: { toast: string | null } };

export type MarkReadMutationVariables = Exact<{
  chatId: string | number;
  seq: number;
}>;


export type MarkReadMutation = { markRead: boolean };

export type BlockBotMutationVariables = Exact<{
  chatId: string | number;
  blocked: boolean;
}>;


export type BlockBotMutation = { blockBot: boolean };

export type RegistrationPolicyQueryVariables = Exact<{ [key: string]: never; }>;


export type RegistrationPolicyQuery = { registrationPolicy: { registration: boolean, invitations: boolean } };

export type GuestChatQueryVariables = Exact<{
  username: string;
}>;


export type GuestChatQuery = { guestChat: { active: boolean, bot: { id: string, name: string, username: string, description: string, online: boolean, avatar: string | null, welcome: string }, commands: Array<{ name: string, description: string, shortcut: string | null }>, messages: Array<{ id: string, chatId: string, seq: number, sender: string, content: unknown, status: string, createdAt: number, editedAt: number | null, replyTo: string | null, deleted: boolean }> } };

export type OpenGuestChatMutationVariables = Exact<{
  username: string;
}>;


export type OpenGuestChatMutation = { openGuestChat: boolean };

export type SendGuestCommandMutationVariables = Exact<{
  username: string;
  command: string;
  clientId: string;
}>;


export type SendGuestCommandMutation = { sendGuestCommand: boolean };

export type MessagesQueryVariables = Exact<{
  chatId: string | number;
  before?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type MessagesQuery = { messages: Array<{ id: string, chatId: string, seq: number, sender: string, content: unknown, status: string, replyTo: string | null, createdAt: number, editedAt: number | null, deleted: boolean }> };

export type SendMessageMutationVariables = Exact<{
  input: SendMessageInput;
}>;


export type SendMessageMutation = { sendMessage: { id: string, chatId: string, seq: number, sender: string, content: unknown, status: string, replyTo: string | null, createdAt: number, editedAt: number | null, deleted: boolean } };

export type SyncQueryVariables = Exact<{
  since: number;
}>;


export type SyncQuery = { sync: { resetRequired: boolean, checkpoint: number, hasMore: boolean, updates: Array<{ seq: number, payload: unknown }> } };

export type PushStatusQueryVariables = Exact<{
  endpoint: string;
}>;


export type PushStatusQuery = { pushStatus: boolean };

export type SubscribePushMutationVariables = Exact<{
  subscription: unknown;
}>;


export type SubscribePushMutation = { subscribePush: boolean };

export type UnsubscribePushMutationVariables = Exact<{
  endpoint: string;
}>;


export type UnsubscribePushMutation = { unsubscribePush: boolean };

export type SessionQueryVariables = Exact<{ [key: string]: never; }>;


export type SessionQuery = { session: { vapidPublicKey: string | null, botWebSocketUrl: string, checkpoint: number, user: { id: string, username: string, displayName: string, bio: string, twoFactorEnabled: boolean, role: PlatformRole }, chats: Array<{ id: string, roles: Array<string>, blocked: boolean, notifications: ChatNotifications, notificationsMutedUntil: number | null, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, avatar: string | null, welcome: string }, preview: { id: string, chatId: string, seq: number, sender: string, content: unknown, status: string, replyTo: string | null, createdAt: number, editedAt: number | null, deleted: boolean } | null, commands: Array<{ name: string, description: string, shortcut: string | null }> }> } };

export type LoginMutationVariables = Exact<{
  username: string;
  password: string;
  otp?: string | null | undefined;
}>;


export type LoginMutation = { login: { vapidPublicKey: string | null, botWebSocketUrl: string, checkpoint: number, user: { id: string, username: string, displayName: string, bio: string, twoFactorEnabled: boolean, role: PlatformRole }, chats: Array<{ id: string, roles: Array<string>, blocked: boolean, notifications: ChatNotifications, notificationsMutedUntil: number | null, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, avatar: string | null, welcome: string }, preview: { id: string, chatId: string, seq: number, sender: string, content: unknown, status: string, replyTo: string | null, createdAt: number, editedAt: number | null, deleted: boolean } | null, commands: Array<{ name: string, description: string, shortcut: string | null }> }> } };

export type RegisterMutationVariables = Exact<{
  username: string;
  password: string;
  displayName: string;
  invite: string;
}>;


export type RegisterMutation = { register: { vapidPublicKey: string | null, botWebSocketUrl: string, checkpoint: number, user: { id: string, username: string, displayName: string, bio: string, twoFactorEnabled: boolean, role: PlatformRole }, chats: Array<{ id: string, roles: Array<string>, blocked: boolean, notifications: ChatNotifications, notificationsMutedUntil: number | null, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean, avatar: string | null, welcome: string }, preview: { id: string, chatId: string, seq: number, sender: string, content: unknown, status: string, replyTo: string | null, createdAt: number, editedAt: number | null, deleted: boolean } | null, commands: Array<{ name: string, description: string, shortcut: string | null }> }> } };

export type LogoutMutationVariables = Exact<{
  pushEndpoint?: string | null | undefined;
}>;


export type LogoutMutation = { logout: boolean };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const UpdateProfileDocument = new TypedDocumentString(`
    mutation UpdateProfile($displayName: String!, $username: String!, $bio: String!) {
  updateProfile(displayName: $displayName, username: $username, bio: $bio) {
    id
    displayName
    username
    bio
    role
    twoFactorEnabled
  }
}
    `) as unknown as TypedDocumentString<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const AdminUserDocument = new TypedDocumentString(`
    query AdminUser($userId: ID!) {
  adminUser(userId: $userId) {
    id
    displayName
    username
    bio
    role
    twoFactorEnabled
  }
}
    `) as unknown as TypedDocumentString<AdminUserQuery, AdminUserQueryVariables>;
export const UpdateAdminUserDocument = new TypedDocumentString(`
    mutation UpdateAdminUser($userId: ID!, $displayName: String!, $username: String!, $bio: String!) {
  updateAdminUser(
    userId: $userId
    displayName: $displayName
    username: $username
    bio: $bio
  ) {
    id
    displayName
    username
    bio
    role
    twoFactorEnabled
  }
}
    `) as unknown as TypedDocumentString<UpdateAdminUserMutation, UpdateAdminUserMutationVariables>;
export const ResetUserPasswordDocument = new TypedDocumentString(`
    mutation ResetUserPassword($userId: ID!, $newPassword: String!) {
  resetUserPassword(userId: $userId, newPassword: $newPassword)
}
    `) as unknown as TypedDocumentString<ResetUserPasswordMutation, ResetUserPasswordMutationVariables>;
export const ChangePasswordDocument = new TypedDocumentString(`
    mutation ChangePassword($password: String!, $newPassword: String!, $otp: String) {
  changePassword(password: $password, newPassword: $newPassword, otp: $otp)
}
    `) as unknown as TypedDocumentString<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const BeginTotpDocument = new TypedDocumentString(`
    mutation BeginTotp($password: String!) {
  beginTotp(password: $password)
}
    `) as unknown as TypedDocumentString<BeginTotpMutation, BeginTotpMutationVariables>;
export const EnableTotpDocument = new TypedDocumentString(`
    mutation EnableTotp($password: String!, $code: String!) {
  enableTotp(password: $password, code: $code)
}
    `) as unknown as TypedDocumentString<EnableTotpMutation, EnableTotpMutationVariables>;
export const DisableTotpDocument = new TypedDocumentString(`
    mutation DisableTotp($password: String!, $otp: String!) {
  disableTotp(password: $password, otp: $otp)
}
    `) as unknown as TypedDocumentString<DisableTotpMutation, DisableTotpMutationVariables>;
export const MySessionsDocument = new TypedDocumentString(`
    query MySessions {
  mySessions {
    id
    current
    userAgent
    createdAt
    expiresAt
  }
}
    `) as unknown as TypedDocumentString<MySessionsQuery, MySessionsQueryVariables>;
export const RevokeMySessionDocument = new TypedDocumentString(`
    mutation RevokeMySession($id: ID!) {
  revokeMySession(id: $id)
}
    `) as unknown as TypedDocumentString<RevokeMySessionMutation, RevokeMySessionMutationVariables>;
export const DeleteMyAccountDocument = new TypedDocumentString(`
    mutation DeleteMyAccount($password: String!, $otp: String) {
  deleteMyAccount(password: $password, otp: $otp)
}
    `) as unknown as TypedDocumentString<DeleteMyAccountMutation, DeleteMyAccountMutationVariables>;
export const AdminUsersDocument = new TypedDocumentString(`
    query AdminUsers($query: String) {
  adminUsers(query: $query) {
    id
    username
    displayName
    role
  }
}
    `) as unknown as TypedDocumentString<AdminUsersQuery, AdminUsersQueryVariables>;
export const AdminInvitesDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<AdminInvitesQuery, AdminInvitesQueryVariables>;
export const CreateInviteDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<CreateInviteMutation, CreateInviteMutationVariables>;
export const AdminBotsDocument = new TypedDocumentString(`
    query AdminBots {
  adminBots {
    id
    username
    name
    description
    online
    listed
    access
    memberCount
    avatar
  }
}
    `) as unknown as TypedDocumentString<AdminBotsQuery, AdminBotsQueryVariables>;
export const CreateBotDocument = new TypedDocumentString(`
    mutation CreateBot($username: String!, $name: String!, $description: String!) {
  createBot(username: $username, name: $name, description: $description) {
    bot {
      id
      username
      name
      description
      online
      listed
      access
    }
    token
  }
}
    `) as unknown as TypedDocumentString<CreateBotMutation, CreateBotMutationVariables>;
export const ResetBotTokenDocument = new TypedDocumentString(`
    mutation ResetBotToken($botId: ID!) {
  resetBotToken(botId: $botId) {
    bot {
      id
      username
      name
      description
      online
      listed
      access
    }
    token
  }
}
    `) as unknown as TypedDocumentString<ResetBotTokenMutation, ResetBotTokenMutationVariables>;
export const SetBotOwnerDocument = new TypedDocumentString(`
    mutation SetBotOwner($botId: ID!, $username: String) {
  setBotOwner(botId: $botId, username: $username)
}
    `) as unknown as TypedDocumentString<SetBotOwnerMutation, SetBotOwnerMutationVariables>;
export const SetUserRoleDocument = new TypedDocumentString(`
    mutation SetUserRole($userId: ID!, $role: PlatformRole!) {
  setUserRole(userId: $userId, role: $role) {
    id
    username
    displayName
    role
  }
}
    `) as unknown as TypedDocumentString<SetUserRoleMutation, SetUserRoleMutationVariables>;
export const SetBotAccessDocument = new TypedDocumentString(`
    mutation SetBotAccess($botId: ID!, $access: BotAccess!) {
  setBotAccess(botId: $botId, access: $access) {
    id
    username
    name
    description
    online
    listed
    access
    guestAccess
  }
}
    `) as unknown as TypedDocumentString<SetBotAccessMutation, SetBotAccessMutationVariables>;
export const IssueBotInviteDocument = new TypedDocumentString(`
    mutation IssueBotInvite($botId: ID!, $roles: [String!], $maxUses: Int, $expiresInDays: Int) {
  issueBotInvite(
    botId: $botId
    roles: $roles
    maxUses: $maxUses
    expiresInDays: $expiresInDays
  ) {
    id
    url
    expiresAt
    revokedAt
    uses
    maxUses
    roles
  }
}
    `) as unknown as TypedDocumentString<IssueBotInviteMutation, IssueBotInviteMutationVariables>;
export const AdminBotDiagnosticsDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<AdminBotDiagnosticsQuery, AdminBotDiagnosticsQueryVariables>;
export const AdminBotDocument = new TypedDocumentString(`
    query AdminBot($botId: ID!) {
  adminBot(botId: $botId) {
    id
    username
    name
    description
    online
    listed
    access
    memberCount
    avatar
    welcome
    guestAccess
    tags
  }
}
    `) as unknown as TypedDocumentString<AdminBotQuery, AdminBotQueryVariables>;
export const InviteBotMemberDocument = new TypedDocumentString(`
    mutation InviteBotMember($botId: ID!, $username: String!, $roles: [String!]!) {
  inviteBotMember(botId: $botId, username: $username, roles: $roles)
}
    `) as unknown as TypedDocumentString<InviteBotMemberMutation, InviteBotMemberMutationVariables>;
export const RevokeBotInviteDocument = new TypedDocumentString(`
    mutation RevokeBotInvite($botId: ID!, $id: ID!) {
  revokeBotInvite(botId: $botId, id: $id)
}
    `) as unknown as TypedDocumentString<RevokeBotInviteMutation, RevokeBotInviteMutationVariables>;
export const BotInvitationsDocument = new TypedDocumentString(`
    query BotInvitations($botId: ID!) {
  botInvitations(botId: $botId) {
    id
    url
    expiresAt
    revokedAt
    uses
    maxUses
    roles
  }
}
    `) as unknown as TypedDocumentString<BotInvitationsQuery, BotInvitationsQueryVariables>;
export const EditBotInviteDocument = new TypedDocumentString(`
    mutation EditBotInvite($botId: ID!, $id: ID!, $roles: [String!]!, $maxUses: Int, $expiresInDays: Int) {
  editBotInvite(
    botId: $botId
    id: $id
    roles: $roles
    maxUses: $maxUses
    expiresInDays: $expiresInDays
  ) {
    id
    url
    expiresAt
    revokedAt
    uses
    maxUses
    roles
  }
}
    `) as unknown as TypedDocumentString<EditBotInviteMutation, EditBotInviteMutationVariables>;
export const EditPlatformInviteDocument = new TypedDocumentString(`
    mutation EditPlatformInvite($code: String!, $role: InviteRole, $maxUses: Int, $expiresInDays: Int) {
  editPlatformInvite(
    code: $code
    role: $role
    maxUses: $maxUses
    expiresInDays: $expiresInDays
  ) {
    code
    url
    expiresAt
    revokedAt
    uses
    maxUses
    role
  }
}
    `) as unknown as TypedDocumentString<EditPlatformInviteMutation, EditPlatformInviteMutationVariables>;
export const RevokePlatformInviteDocument = new TypedDocumentString(`
    mutation RevokePlatformInvite($code: String!) {
  revokePlatformInvite(code: $code)
}
    `) as unknown as TypedDocumentString<RevokePlatformInviteMutation, RevokePlatformInviteMutationVariables>;
export const BotMembershipsDocument = new TypedDocumentString(`
    query BotMemberships($botId: ID!) {
  botMemberships(botId: $botId) {
    roles
    roleDefinitions {
      code
      name
      virtual
    }
    members {
      chatId
      username
      displayName
      revoked
      roles
    }
  }
}
    `) as unknown as TypedDocumentString<BotMembershipsQuery, BotMembershipsQueryVariables>;
export const SetBotMemberRolesDocument = new TypedDocumentString(`
    mutation SetBotMemberRoles($botId: ID!, $chatId: ID!, $roles: [String!]!) {
  setBotMemberRoles(botId: $botId, chatId: $chatId, roles: $roles)
}
    `) as unknown as TypedDocumentString<SetBotMemberRolesMutation, SetBotMemberRolesMutationVariables>;
export const SetBotMemberRevokedDocument = new TypedDocumentString(`
    mutation SetBotMemberRevoked($botId: ID!, $chatId: ID!, $revoked: Boolean!) {
  setBotMemberRevoked(botId: $botId, chatId: $chatId, revoked: $revoked)
}
    `) as unknown as TypedDocumentString<SetBotMemberRevokedMutation, SetBotMemberRevokedMutationVariables>;
export const ChatProfileDocument = new TypedDocumentString(`
    query ChatProfile($chatId: ID!, $beforeMediaSeq: Int) {
  chatProfile(chatId: $chatId, beforeMediaSeq: $beforeMediaSeq) {
    bot {
      id
      username
      name
      description
      online
      listed
      avatar
      welcome
    }
    blocked
    notifications
    notificationsMutedUntil
    media
    olderMediaBefore
  }
}
    `) as unknown as TypedDocumentString<ChatProfileQuery, ChatProfileQueryVariables>;
export const UpdateBotProfileDocument = new TypedDocumentString(`
    mutation UpdateBotProfile($botId: ID!, $description: String!, $welcome: String!, $avatar: String, $tags: [String!]) {
  updateBotProfile(
    botId: $botId
    description: $description
    welcome: $welcome
    avatar: $avatar
    tags: $tags
  ) {
    id
    username
    name
    description
    online
    listed
    access
    avatar
    welcome
    tags
  }
}
    `) as unknown as TypedDocumentString<UpdateBotProfileMutation, UpdateBotProfileMutationVariables>;
export const SetBotGuestAccessDocument = new TypedDocumentString(`
    mutation SetBotGuestAccess($botId: ID!, $enabled: Boolean!) {
  setBotGuestAccess(botId: $botId, enabled: $enabled) {
    guestAccess
  }
}
    `) as unknown as TypedDocumentString<SetBotGuestAccessMutation, SetBotGuestAccessMutationVariables>;
export const DeleteChatDocument = new TypedDocumentString(`
    mutation DeleteChat($chatId: ID!) {
  deleteChat(chatId: $chatId)
}
    `) as unknown as TypedDocumentString<DeleteChatMutation, DeleteChatMutationVariables>;
export const SetChatNotificationsDocument = new TypedDocumentString(`
    mutation SetChatNotifications($chatId: ID!, $mode: ChatNotifications!) {
  setChatNotifications(chatId: $chatId, mode: $mode) {
    id
    bot {
      id
      username
      name
      description
      online
      listed
      avatar
      welcome
      tags
    }
    roles
    blocked
    notifications
    notificationsMutedUntil
    unread
    lastMessageAt
    createdAt
    commands {
      name
      description
      shortcut
    }
  }
}
    `) as unknown as TypedDocumentString<SetChatNotificationsMutation, SetChatNotificationsMutationVariables>;
export const SetChatMuteDocument = new TypedDocumentString(`
    mutation SetChatMute($chatId: ID!, $mutedUntil: Float) {
  setChatMute(chatId: $chatId, mutedUntil: $mutedUntil) {
    id
    bot {
      id
      username
      name
      description
      online
      listed
      avatar
      welcome
      tags
    }
    roles
    blocked
    notifications
    notificationsMutedUntil
    unread
    lastMessageAt
    createdAt
    commands {
      name
      description
      shortcut
    }
  }
}
    `) as unknown as TypedDocumentString<SetChatMuteMutation, SetChatMuteMutationVariables>;
export const BrowseBotsDocument = new TypedDocumentString(`
    query BrowseBots($query: String) {
  browseBots(query: $query) {
    id
    username
    name
    description
    online
    listed
    avatar
    welcome
    tags
  }
}
    `) as unknown as TypedDocumentString<BrowseBotsQuery, BrowseBotsQueryVariables>;
export const BrowseBotDocument = new TypedDocumentString(`
    query BrowseBot($botId: ID!) {
  browseBot(botId: $botId) {
    bot {
      id
      username
      name
      description
      online
      listed
      access
      avatar
      welcome
      tags
    }
    commands {
      name
      description
      shortcut
    }
  }
}
    `) as unknown as TypedDocumentString<BrowseBotQuery, BrowseBotQueryVariables>;
export const AddBotDocument = new TypedDocumentString(`
    mutation AddBot($username: String!, $invite: String) {
  addBot(username: $username, invite: $invite) {
    id
    bot {
      id
      username
      name
      description
      online
      listed
      avatar
      welcome
    }
    roles
    blocked
    notifications
    notificationsMutedUntil
    unread
    lastMessageAt
    createdAt
    commands {
      name
      description
      shortcut
    }
  }
}
    `) as unknown as TypedDocumentString<AddBotMutation, AddBotMutationVariables>;
export const PressButtonDocument = new TypedDocumentString(`
    mutation PressButton($chatId: ID!, $messageId: ID!, $data: String!) {
  pressButton(chatId: $chatId, messageId: $messageId, data: $data) {
    toast
  }
}
    `) as unknown as TypedDocumentString<PressButtonMutation, PressButtonMutationVariables>;
export const MarkReadDocument = new TypedDocumentString(`
    mutation MarkRead($chatId: ID!, $seq: Int!) {
  markRead(chatId: $chatId, seq: $seq)
}
    `) as unknown as TypedDocumentString<MarkReadMutation, MarkReadMutationVariables>;
export const BlockBotDocument = new TypedDocumentString(`
    mutation BlockBot($chatId: ID!, $blocked: Boolean!) {
  blockBot(chatId: $chatId, blocked: $blocked)
}
    `) as unknown as TypedDocumentString<BlockBotMutation, BlockBotMutationVariables>;
export const RegistrationPolicyDocument = new TypedDocumentString(`
    query RegistrationPolicy {
  registrationPolicy {
    registration
    invitations
  }
}
    `) as unknown as TypedDocumentString<RegistrationPolicyQuery, RegistrationPolicyQueryVariables>;
export const GuestChatDocument = new TypedDocumentString(`
    query GuestChat($username: String!) {
  guestChat(username: $username) {
    active
    bot {
      id
      name
      username
      description
      online
      avatar
      welcome
    }
    commands {
      name
      description
      shortcut
    }
    messages {
      id
      chatId
      seq
      sender
      content
      status
      createdAt
      editedAt
      replyTo
      deleted
    }
  }
}
    `) as unknown as TypedDocumentString<GuestChatQuery, GuestChatQueryVariables>;
export const OpenGuestChatDocument = new TypedDocumentString(`
    mutation OpenGuestChat($username: String!) {
  openGuestChat(username: $username)
}
    `) as unknown as TypedDocumentString<OpenGuestChatMutation, OpenGuestChatMutationVariables>;
export const SendGuestCommandDocument = new TypedDocumentString(`
    mutation SendGuestCommand($username: String!, $command: String!, $clientId: String!) {
  sendGuestCommand(username: $username, command: $command, clientId: $clientId)
}
    `) as unknown as TypedDocumentString<SendGuestCommandMutation, SendGuestCommandMutationVariables>;
export const MessagesDocument = new TypedDocumentString(`
    query Messages($chatId: ID!, $before: Int, $limit: Int = 50) {
  messages(chatId: $chatId, before: $before, limit: $limit) {
    id
    chatId
    seq
    sender
    content
    status
    replyTo
    createdAt
    editedAt
    deleted
  }
}
    `) as unknown as TypedDocumentString<MessagesQuery, MessagesQueryVariables>;
export const SendMessageDocument = new TypedDocumentString(`
    mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    id
    chatId
    seq
    sender
    content
    status
    replyTo
    createdAt
    editedAt
    deleted
  }
}
    `) as unknown as TypedDocumentString<SendMessageMutation, SendMessageMutationVariables>;
export const SyncDocument = new TypedDocumentString(`
    query Sync($since: Int!) {
  sync(since: $since) {
    updates {
      seq
      payload
    }
    resetRequired
    checkpoint
    hasMore
  }
}
    `) as unknown as TypedDocumentString<SyncQuery, SyncQueryVariables>;
export const PushStatusDocument = new TypedDocumentString(`
    query PushStatus($endpoint: String!) {
  pushStatus(endpoint: $endpoint)
}
    `) as unknown as TypedDocumentString<PushStatusQuery, PushStatusQueryVariables>;
export const SubscribePushDocument = new TypedDocumentString(`
    mutation SubscribePush($subscription: JSON!) {
  subscribePush(subscription: $subscription)
}
    `) as unknown as TypedDocumentString<SubscribePushMutation, SubscribePushMutationVariables>;
export const UnsubscribePushDocument = new TypedDocumentString(`
    mutation UnsubscribePush($endpoint: String!) {
  unsubscribePush(endpoint: $endpoint)
}
    `) as unknown as TypedDocumentString<UnsubscribePushMutation, UnsubscribePushMutationVariables>;
export const SessionDocument = new TypedDocumentString(`
    query Session {
  session {
    user {
      id
      username
      displayName
      bio
      twoFactorEnabled
      role
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
        avatar
        welcome
      }
      roles
      blocked
      notifications
      notificationsMutedUntil
      unread
      lastMessageAt
      preview {
        id
        chatId
        seq
        sender
        content
        status
        replyTo
        createdAt
        editedAt
        deleted
      }
      createdAt
      commands {
        name
        description
        shortcut
      }
    }
    vapidPublicKey
    botWebSocketUrl
    checkpoint
  }
}
    `) as unknown as TypedDocumentString<SessionQuery, SessionQueryVariables>;
export const LoginDocument = new TypedDocumentString(`
    mutation Login($username: String!, $password: String!, $otp: String) {
  login(username: $username, password: $password, otp: $otp) {
    user {
      id
      username
      displayName
      bio
      twoFactorEnabled
      role
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
        avatar
        welcome
      }
      roles
      blocked
      notifications
      notificationsMutedUntil
      unread
      lastMessageAt
      preview {
        id
        chatId
        seq
        sender
        content
        status
        replyTo
        createdAt
        editedAt
        deleted
      }
      createdAt
      commands {
        name
        description
        shortcut
      }
    }
    vapidPublicKey
    botWebSocketUrl
    checkpoint
  }
}
    `) as unknown as TypedDocumentString<LoginMutation, LoginMutationVariables>;
export const RegisterDocument = new TypedDocumentString(`
    mutation Register($username: String!, $password: String!, $displayName: String!, $invite: String!) {
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
      bio
      twoFactorEnabled
      role
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
        avatar
        welcome
      }
      roles
      blocked
      notifications
      notificationsMutedUntil
      unread
      lastMessageAt
      preview {
        id
        chatId
        seq
        sender
        content
        status
        replyTo
        createdAt
        editedAt
        deleted
      }
      createdAt
      commands {
        name
        description
        shortcut
      }
    }
    vapidPublicKey
    botWebSocketUrl
    checkpoint
  }
}
    `) as unknown as TypedDocumentString<RegisterMutation, RegisterMutationVariables>;
export const LogoutDocument = new TypedDocumentString(`
    mutation Logout($pushEndpoint: String) {
  logout(pushEndpoint: $pushEndpoint)
}
    `) as unknown as TypedDocumentString<LogoutMutation, LogoutMutationVariables>;