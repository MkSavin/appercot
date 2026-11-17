import { z } from 'zod'
import {
  BUTTON_CALLBACK_MAX_BYTES,
  BUTTONS_MAX_COLUMNS,
  BUTTONS_MAX_ROWS,
  COMMAND_NAME_MAX,
  MEDIA_MAX,
  TEXT_MAX,
} from './limits'

const textEncoder = new TextEncoder()

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const hasContent = (content: { text?: string; media?: unknown[]; buttons?: unknown[] }) =>
  content.text !== undefined || content.media !== undefined || content.buttons !== undefined

export const CallbackButtonSchema = z.strictObject({
  text: z.string().min(1),
  callback: z
    .string()
    .min(1)
    .refine((value) => textEncoder.encode(value).length <= BUTTON_CALLBACK_MAX_BYTES),
})

export const UrlButtonSchema = z.strictObject({
  text: z.string().min(1),
  url: z.url().refine(isHttpUrl),
})

export const CommandButtonSchema = z.strictObject({
  text: z.string().min(1),
  command: z.string().regex(new RegExp(`^/[a-z0-9_]{1,${COMMAND_NAME_MAX}}$`)),
})

export const ButtonSchema = z.union([CallbackButtonSchema, UrlButtonSchema, CommandButtonSchema])

export const MediaSchema = z.strictObject({
  fileId: z.string().min(1),
  kind: z.enum(['image', 'video', 'audio', 'file']),
  caption: z.string().max(TEXT_MAX).optional(),
})

const mediaSchema = z.array(MediaSchema).min(1).max(MEDIA_MAX).optional()
const textSchema = z.string().min(1).max(TEXT_MAX).optional()

export const MessageContentSchema = z
  .strictObject({
    text: textSchema,
    media: mediaSchema,
    buttons: z
      .array(z.array(ButtonSchema).min(1).max(BUTTONS_MAX_COLUMNS))
      .min(1)
      .max(BUTTONS_MAX_ROWS)
      .optional(),
  })
  .refine(hasContent)

export const UserContentSchema = z
  .strictObject({
    text: textSchema,
    media: mediaSchema,
  })
  .refine(hasContent)

export const JsonValueSchema = z.json()

export type JsonValue = z.infer<typeof JsonValueSchema>
export type Button = z.infer<typeof ButtonSchema>
export type Media = z.infer<typeof MediaSchema>
export type MessageContent = z.infer<typeof MessageContentSchema>
export type UserContent = z.infer<typeof UserContentSchema>
