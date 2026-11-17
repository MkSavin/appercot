import type { ClientChat, Message, UserRef } from '@appercot/protocol'

export type SessionUser = Readonly<UserRef & { isAdmin: boolean }>
export type SessionPayload = Readonly<{
  user: SessionUser
  chats: ClientChat[]
  vapidPublicKey: string | null
}>
export type MessageDeliveryStatus = Message['status'] | 'pending' | 'failed'
export type ChatMessage = Readonly<
  Omit<Message, 'status'> & { status: MessageDeliveryStatus; clientId?: string }
>
export type ConnectionStatus = 'connecting' | 'online' | 'offline'
