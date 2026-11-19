import { type Message, MessageSchema } from '@appercot/protocol'
import type { messages } from '../db/schema'

export const toMessageDto = (message: typeof messages.$inferSelect): Message =>
  MessageSchema.parse({
    id: message.id,
    chatId: message.chatId,
    seq: message.seq,
    sender: message.sender,
    content: message.content,
    status: message.status,
    replyTo: message.replyTo ?? undefined,
    createdAt: message.createdAt,
    editedAt: message.editedAt ?? undefined,
    ...(message.deletedAt !== null ? { deleted: true } : {}),
  })
