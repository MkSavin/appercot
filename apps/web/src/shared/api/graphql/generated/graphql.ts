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

export type SessionQueryVariables = Exact<{ [key: string]: never; }>;


export type SessionQuery = { session: { vapidPublicKey: string | null, user: { id: string, username: string, displayName: string, isAdmin: boolean }, chats: Array<{ id: string, roles: Array<string>, blocked: boolean, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean } }> } };

export type LoginMutationVariables = Exact<{
  username: string;
  password: string;
}>;


export type LoginMutation = { login: { vapidPublicKey: string | null, user: { id: string, username: string, displayName: string, isAdmin: boolean }, chats: Array<{ id: string, roles: Array<string>, blocked: boolean, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean } }> } };

export type RegisterMutationVariables = Exact<{
  username: string;
  password: string;
  displayName: string;
  invite: string;
}>;


export type RegisterMutation = { register: { vapidPublicKey: string | null, user: { id: string, username: string, displayName: string, isAdmin: boolean }, chats: Array<{ id: string, roles: Array<string>, blocked: boolean, unread: number, lastMessageAt: number | null, createdAt: number, bot: { id: string, username: string, name: string, description: string, online: boolean, listed: boolean } }> } };

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