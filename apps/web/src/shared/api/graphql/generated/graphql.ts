/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type SendMessageInput = {
  chatId: string | number;
  clientId: string;
  content: unknown;
};

export type AdminUsersQueryVariables = Exact<{
  query?: string | null | undefined;
}>;


export type AdminUsersQuery = { adminUsers: Array<{ id: string, username: string, displayName: string, isAdmin: boolean }> };

export type AdminInvitesQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminInvitesQuery = { adminInvites: Array<{ code: string, uses: number, maxUses: number | null, url: string }> };

export type CreateInviteMutationVariables = Exact<{
  maxUses?: number | null | undefined;
  expiresInDays?: number | null | undefined;
}>;


export type CreateInviteMutation = { createInvite: { code: string, uses: number, maxUses: number | null, url: string } };

export type AdminBotsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminBotsQuery = { adminBots: Array<{ id: string, username: string, name: string, description: string, online: boolean, listed: boolean }> };

export type CreateBotMutationVariables = Exact<{
  username: string;
  name: string;
  description: string;
}>;


export type CreateBotMutation = { createBot: { token: string, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean } } };

export type ResetBotTokenMutationVariables = Exact<{
  botId: string | number;
}>;


export type ResetBotTokenMutation = { resetBotToken: { token: string, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean } } };

export type SetBotOwnerMutationVariables = Exact<{
  botId: string | number;
  username?: string | null | undefined;
}>;


export type SetBotOwnerMutation = { setBotOwner: boolean };

export type SetBotListedMutationVariables = Exact<{
  botId: string | number;
  listed: boolean;
}>;


export type SetBotListedMutation = { setBotListed: boolean };

export type BrowseBotsQueryVariables = Exact<{
  query?: string | null | undefined;
}>;


export type BrowseBotsQuery = { browseBots: Array<{ id: string, username: string, name: string, description: string, online: boolean, listed: boolean }> };

export type AddBotMutationVariables = Exact<{
  username: string;
}>;


export type AddBotMutation = { addBot: { id: string, roles: Array<string>, blocked: boolean, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean }, commands: Array<{ name: string, description: string }> } };

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

export type ClearChatMutationVariables = Exact<{
  chatId: string | number;
}>;


export type ClearChatMutation = { clearChat: boolean };

export type BlockBotMutationVariables = Exact<{
  chatId: string | number;
  blocked: boolean;
}>;


export type BlockBotMutation = { blockBot: boolean };

export type MessagesQueryVariables = Exact<{
  chatId: string | number;
  before?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type MessagesQuery = { messages: Array<{ id: string, chatId: string, seq: number, sender: string, content: unknown, status: string, replyTo: string | null, createdAt: number, editedAt: number | null }> };

export type SendMessageMutationVariables = Exact<{
  input: SendMessageInput;
}>;


export type SendMessageMutation = { sendMessage: { id: string, chatId: string, seq: number, sender: string, content: unknown, status: string, replyTo: string | null, createdAt: number, editedAt: number | null } };

export type SyncQueryVariables = Exact<{
  since: number;
}>;


export type SyncQuery = { sync: { resetRequired: boolean, updates: Array<{ seq: number, payload: unknown }> } };

export type SubscribePushMutationVariables = Exact<{
  subscription: unknown;
}>;


export type SubscribePushMutation = { subscribePush: boolean };

export type UnsubscribePushMutationVariables = Exact<{
  endpoint: string;
}>;


export type UnsubscribePushMutation = { unsubscribePush: boolean };

export type SessionQueryVariables = Exact<{ [key: string]: never; }>;


export type SessionQuery = { session: { vapidPublicKey: string | null, user: { id: string, username: string, displayName: string, isAdmin: boolean }, chats: Array<{ id: string, roles: Array<string>, blocked: boolean, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean }, commands: Array<{ name: string, description: string }> }> } };

export type LoginMutationVariables = Exact<{
  username: string;
  password: string;
}>;


export type LoginMutation = { login: { vapidPublicKey: string | null, user: { id: string, username: string, displayName: string, isAdmin: boolean }, chats: Array<{ id: string, roles: Array<string>, blocked: boolean, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean }, commands: Array<{ name: string, description: string }> }> } };

export type RegisterMutationVariables = Exact<{
  username: string;
  password: string;
  displayName: string;
  invite: string;
}>;


export type RegisterMutation = { register: { vapidPublicKey: string | null, user: { id: string, username: string, displayName: string, isAdmin: boolean }, chats: Array<{ id: string, roles: Array<string>, blocked: boolean, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean }, commands: Array<{ name: string, description: string }> }> } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


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

export const AdminUsersDocument = new TypedDocumentString(`
    query AdminUsers($query: String) {
  adminUsers(query: $query) {
    id
    username
    displayName
    isAdmin
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
  }
}
    `) as unknown as TypedDocumentString<AdminInvitesQuery, AdminInvitesQueryVariables>;
export const CreateInviteDocument = new TypedDocumentString(`
    mutation CreateInvite($maxUses: Int, $expiresInDays: Int) {
  createInvite(maxUses: $maxUses, expiresInDays: $expiresInDays) {
    code
    uses
    maxUses
    url
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
export const SetBotListedDocument = new TypedDocumentString(`
    mutation SetBotListed($botId: ID!, $listed: Boolean!) {
  setBotListed(botId: $botId, listed: $listed)
}
    `) as unknown as TypedDocumentString<SetBotListedMutation, SetBotListedMutationVariables>;
export const BrowseBotsDocument = new TypedDocumentString(`
    query BrowseBots($query: String) {
  browseBots(query: $query) {
    id
    username
    name
    description
    online
    listed
  }
}
    `) as unknown as TypedDocumentString<BrowseBotsQuery, BrowseBotsQueryVariables>;
export const AddBotDocument = new TypedDocumentString(`
    mutation AddBot($username: String!) {
  addBot(username: $username) {
    id
    bot {
      id
      username
      name
      description
      online
      listed
    }
    roles
    blocked
    unread
    lastMessageAt
    createdAt
    commands {
      name
      description
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
export const ClearChatDocument = new TypedDocumentString(`
    mutation ClearChat($chatId: ID!) {
  clearChat(chatId: $chatId)
}
    `) as unknown as TypedDocumentString<ClearChatMutation, ClearChatMutationVariables>;
export const BlockBotDocument = new TypedDocumentString(`
    mutation BlockBot($chatId: ID!, $blocked: Boolean!) {
  blockBot(chatId: $chatId, blocked: $blocked)
}
    `) as unknown as TypedDocumentString<BlockBotMutation, BlockBotMutationVariables>;
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
  }
}
    `) as unknown as TypedDocumentString<SyncQuery, SyncQueryVariables>;
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
      isAdmin
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
      }
      roles
      blocked
      unread
      lastMessageAt
      createdAt
      commands {
        name
        description
      }
    }
    vapidPublicKey
  }
}
    `) as unknown as TypedDocumentString<SessionQuery, SessionQueryVariables>;
export const LoginDocument = new TypedDocumentString(`
    mutation Login($username: String!, $password: String!) {
  login(username: $username, password: $password) {
    user {
      id
      username
      displayName
      isAdmin
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
      }
      roles
      blocked
      unread
      lastMessageAt
      createdAt
      commands {
        name
        description
      }
    }
    vapidPublicKey
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
      isAdmin
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
      }
      roles
      blocked
      unread
      lastMessageAt
      createdAt
      commands {
        name
        description
      }
    }
    vapidPublicKey
  }
}
    `) as unknown as TypedDocumentString<RegisterMutation, RegisterMutationVariables>;
export const LogoutDocument = new TypedDocumentString(`
    mutation Logout {
  logout
}
    `) as unknown as TypedDocumentString<LogoutMutation, LogoutMutationVariables>;