import { z } from 'zod'
import { MessageContentSchema } from './content.js'
import { COMMAND_NAME_MAX } from './limits.js'
import { ShortcutSchema } from './shortcuts.js'

const idSchema = z.string().min(1)
const timestampSchema = z.int().nonnegative()

export const PlatformRoleSchema = z.enum(['user', 'admin', 'owner'])
export type PlatformRole = z.infer<typeof PlatformRoleSchema>
export const BotAccessSchema = z.enum(['public', 'by_link'])
export type BotAccess = z.infer<typeof BotAccessSchema>

export const BOT_SYSTEM_ROLES = ['guest', 'owner'] as const
export const RESERVED_BOT_ROLES: readonly string[] = [
  ...BOT_SYSTEM_ROLES,
  'all',
  'anonymous',
  'authenticated',
]
export const BotRoleSchema = z.strictObject({
  code: z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/),
  name: z.string().trim().min(1).max(100),
})
export type BotRole = z.infer<typeof BotRoleSchema>

export const allowsBotAction = (
  required: readonly string[] | undefined | null,
  roles: readonly string[],
) =>
  roles.includes('guest')
    ? required?.includes('guest') === true
    : !required?.length ||
      required.some((role) => role === 'all' || role === 'authenticated' || roles.includes(role))

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
  deleted: z.boolean().optional(),
})

export const BotCommandSchema = z.strictObject({
  name: z.string().regex(new RegExp(`^[a-z0-9_]{1,${COMMAND_NAME_MAX}}$`)),
  description: z.string().min(1),
  roles: z.array(z.string().min(1)).optional(),
  shortcut: ShortcutSchema.optional(),
})

export type UserRef = z.infer<typeof UserRefSchema>
export type BotRef = z.infer<typeof BotRefSchema>
export type ChatRef = z.infer<typeof ChatRefSchema>
export type Message = z.infer<typeof MessageSchema>
export type BotCommand = z.infer<typeof BotCommandSchema>
