import { z } from 'zod'
import {
  BotCommandSchema,
  BotRefSchema,
  ChatRefSchema,
  MessageSchema,
  PlatformRoleSchema,
} from './entities'

const idSchema = z.string().min(1)

export const ClientChatSchema = ChatRefSchema.extend({
  bot: BotRefSchema.extend({
    listed: z.boolean(),
    avatar: z.string().nullable().optional(),
    welcome: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  unread: z.int().nonnegative(),
  lastMessageAt: z.int().nonnegative().nullable(),
  commands: z.array(BotCommandSchema).optional(),
  notifications: z.enum(['all', 'silent', 'off']).optional(),
  preview: MessageSchema.nullable().optional(),
})

export const MessageNewUpdateSchema = z.strictObject({
  type: z.literal('message.new'),
  message: MessageSchema,
})

export const MessageEditedUpdateSchema = z.strictObject({
  type: z.literal('message.edited'),
  message: MessageSchema,
})

export const MessageDeletedUpdateSchema = z.strictObject({
  type: z.literal('message.deleted'),
  chatId: idSchema,
  messageId: idSchema,
  clientId: idSchema.optional(),
})

export const MessageStatusUpdateSchema = z.strictObject({
  type: z.literal('message.status'),
  chatId: idSchema,
  messageId: idSchema,
  status: z.enum(['accepted', 'processed']),
})

export const ChatUpdatedUpdateSchema = z.strictObject({
  type: z.literal('chat.updated'),
  chat: ClientChatSchema,
})

export const ChatClearedUpdateSchema = z.strictObject({
  type: z.literal('chat.cleared'),
  chatId: idSchema,
})

export const ChatRemovedUpdateSchema = z.strictObject({
  type: z.literal('chat.removed'),
  chatId: idSchema,
})

export const BotTypingUpdateSchema = z.strictObject({
  type: z.literal('bot.typing'),
  chatId: idSchema,
})

export const BotPresenceUpdateSchema = z.strictObject({
  type: z.literal('bot.presence'),
  botId: idSchema,
  online: z.boolean(),
})

export const PlatformRoleUpdateSchema = z.strictObject({
  type: z.literal('platform.role'),
  role: PlatformRoleSchema,
})

export const ClientUpdateSchema = z.discriminatedUnion('type', [
  MessageNewUpdateSchema,
  MessageEditedUpdateSchema,
  MessageDeletedUpdateSchema,
  MessageStatusUpdateSchema,
  ChatUpdatedUpdateSchema,
  ChatClearedUpdateSchema,
  ChatRemovedUpdateSchema,
  BotTypingUpdateSchema,
  BotPresenceUpdateSchema,
  PlatformRoleUpdateSchema,
])

export const ClientUpdateFrameSchema = z.strictObject({
  t: z.literal('upd'),
  seq: z.int().positive(),
  update: ClientUpdateSchema,
})

export const ClientPongFrameSchema = z.strictObject({ t: z.literal('pong') })
export const ClientFocusFrameSchema = z.strictObject({
  t: z.literal('focus'),
  chatId: idSchema.nullable(),
})
export const ClientPingFrameSchema = z.strictObject({ t: z.literal('ping') })

export const ServerToClientFrameSchema = z.union([ClientUpdateFrameSchema, ClientPongFrameSchema])
export const ClientToServerFrameSchema = z.union([ClientFocusFrameSchema, ClientPingFrameSchema])

export type ClientChat = z.infer<typeof ClientChatSchema>
export type ClientUpdate = z.infer<typeof ClientUpdateSchema>
export type ClientUpdateFrame = z.infer<typeof ClientUpdateFrameSchema>
export type ServerToClientFrame = z.infer<typeof ServerToClientFrameSchema>
export type ClientToServerFrame = z.infer<typeof ClientToServerFrameSchema>
