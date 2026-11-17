import { z } from 'zod'
import { MessageContentSchema } from './content'
import { COMMAND_NAME_MAX } from './limits'

const idSchema = z.string().min(1)
const timestampSchema = z.int().nonnegative()

export const UserRefSchema = z.strictObject({
  id: idSchema,
  username: z.string().min(1),
  displayName: z.string().min(1),
})

export const BotRefSchema = z.strictObject({
  id: idSchema,
  username: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  online: z.boolean(),
})

export const ChatRefSchema = z.strictObject({
  id: idSchema,
  roles: z.array(z.string().min(1)),
  blocked: z.boolean(),
  createdAt: timestampSchema,
})

export const MessageSchema = z.strictObject({
  id: idSchema,
  chatId: idSchema,
  seq: z.int().positive(),
  sender: z.enum(['user', 'bot', 'system']),
  content: MessageContentSchema,
  status: z.enum(['accepted', 'processed']),
  replyTo: idSchema.optional(),
  createdAt: timestampSchema,
  editedAt: timestampSchema.optional(),
})

export const BotCommandSchema = z.strictObject({
  name: z.string().regex(new RegExp(`^[a-z0-9_]{1,${COMMAND_NAME_MAX}}$`)),
  description: z.string().min(1),
  roles: z.array(z.string().min(1)).optional(),
})

export type UserRef = z.infer<typeof UserRefSchema>
export type BotRef = z.infer<typeof BotRefSchema>
export type ChatRef = z.infer<typeof ChatRefSchema>
export type Message = z.infer<typeof MessageSchema>
export type BotCommand = z.infer<typeof BotCommandSchema>
