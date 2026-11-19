import type { ClientChat, Message, PlatformRole, UserRef } from '@appercot/protocol'

export type ChatConnection = ClientChat
export type SessionUser = Readonly<
  UserRef & { role: PlatformRole; bio?: string; twoFactorEnabled?: boolean }
>
export type SessionPayload = Readonly<{
  user: SessionUser
  chats: ChatConnection[]
  vapidPublicKey: string | null
  checkpoint?: number
}>
export type MessageDeliveryStatus = Message['status'] | 'pending' | 'failed'
export type ChatMessage = Readonly<
  Omit<Message, 'status'> & { status: MessageDeliveryStatus; clientId?: string }
>
export type ConnectionStatus = 'connecting' | 'online' | 'offline'
