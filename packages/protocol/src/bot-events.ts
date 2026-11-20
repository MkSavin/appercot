import { z } from 'zod'
import { ChatRefSchema, MessageSchema, UserRefSchema } from './entities.js'

const sessionContextSchema = {
  chat: ChatRefSchema,
  user: UserRefSchema,
}

export const ChatStartedEventSchema = z.strictObject({
  type: z.literal('chat_started'),
  ...sessionContextSchema,
})

export const MessageEventSchema = z.strictObject({
  type: z.literal('message'),
  ...sessionContextSchema,
  message: MessageSchema,
})

export const CommandEventSchema = z.strictObject({
  type: z.literal('command'),
  ...sessionContextSchema,
  message: MessageSchema,
  name: z.string().min(1),
})

export const CallbackEventSchema = z.strictObject({
  type: z.literal('callback'),
  ...sessionContextSchema,
  messageId: z.string().min(1),
  data: z.string().min(1),
  callbackId: z.string().min(1),
})

export const ChatUpdatedEventSchema = z.strictObject({
  type: z.literal('chat_updated'),
  ...sessionContextSchema,
})

export const BotBlockedEventSchema = z.strictObject({
  type: z.literal('bot_blocked'),
  ...sessionContextSchema,
})

export const BotUnblockedEventSchema = z.strictObject({
  type: z.literal('bot_unblocked'),
  ...sessionContextSchema,
})

export const ChatClearedEventSchema = z.strictObject({
  type: z.literal('chat_cleared'),
  ...sessionContextSchema,
})

export const BotEventSchema = z.discriminatedUnion('type', [
  ChatStartedEventSchema,
  MessageEventSchema,
  CommandEventSchema,
  CallbackEventSchema,
  ChatUpdatedEventSchema,
  BotBlockedEventSchema,
  BotUnblockedEventSchema,
  ChatClearedEventSchema,
])

export type BotEvent = z.infer<typeof BotEventSchema>
export type BotEventType = BotEvent['type']
export type BotEventListener<EventType extends BotEventType = BotEventType> = (
  event: Extract<BotEvent, { type: EventType }>,
) => void | Promise<void>
