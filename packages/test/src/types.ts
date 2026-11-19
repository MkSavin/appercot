import type { Message, MessageContent, UserContent } from '@appercot/protocol'

export interface UserFixture {
  id: string
  username: string
  displayName: string
  password: string
}

export interface BotFixture {
  id: string
  username: string
  name: string
  ownerId: string | null
  token: string
}

export interface ChatFixture {
  id: string
  userId: string
  botId: string
}

export interface BaselineChatFixture extends ChatFixture {
  messages: Message[]
}

export interface FixtureManifest {
  admin: UserFixture | null
  users: UserFixture[]
  bots: BotFixture[]
  chats: BaselineChatFixture[]
}

export interface CreateUserInput {
  id?: string
  username: string
  displayName: string
  password: string
}

export interface CreateBotInput {
  id?: string
  username: string
  name: string
  ownerId: string
  description?: string
  tags?: string[]
  listed?: boolean
  access?: 'public' | 'by_link'
  defaultRoles?: string[]
}

export interface CreateChatInput {
  id?: string
  userId: string
  botId: string
}

interface SendMessageBase {
  chatId: string
}

export type SendMessageInput = SendMessageBase &
  (
    | { sender: 'user'; clientId: string; content: UserContent }
    | { sender: 'bot'; clientId?: string; content: MessageContent }
  )

export type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

export interface AppercotTestClientOptions {
  endpoint: string
  token: string
  timeoutMs?: number
  fetch?: FetchImplementation
}
