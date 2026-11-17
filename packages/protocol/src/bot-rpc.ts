import { z } from 'zod'
import { BotEventSchema } from './bot-events'
import { MessageContentSchema } from './content'
import { BotCommandSchema, BotRefSchema, MessageSchema } from './entities'
import { ErrorCodeSchema } from './errors'
import { KV_KEY_MAX } from './limits'

const idSchema = z.string().min(1)
const chatIdSchema = { chatId: idSchema }
const jsonValueSchema = z.json()

export const EmptyParamsSchema = z.strictObject({})
export const OkResultSchema = z.strictObject({ ok: z.literal(true) })

export const SetCommandsParamsSchema = z.strictObject({
  commands: z.array(BotCommandSchema),
})

export const SetRolesParamsSchema = z.strictObject({
  roles: z.array(z.string().min(1)),
  defaultRoles: z.array(z.string().min(1)).optional(),
  listed: z.boolean().optional(),
  access: z.enum(['public', 'by_link']).optional(),
})

export const SendMessageParamsSchema = z.strictObject({
  ...chatIdSchema,
  content: MessageContentSchema,
  replyTo: idSchema.optional(),
})

export const EditMessageParamsSchema = z.strictObject({
  ...chatIdSchema,
  messageId: idSchema,
  content: MessageContentSchema,
})

export const DeleteMessageParamsSchema = z.strictObject({
  ...chatIdSchema,
  messageId: idSchema,
})

export const AnswerCallbackParamsSchema = z.strictObject({
  callbackId: idSchema,
  toast: z.string().optional(),
})

export const SendTypingParamsSchema = z.strictObject(chatIdSchema)

export const SetChatRolesParamsSchema = z.strictObject({
  ...chatIdSchema,
  roles: z.array(z.string().min(1)),
})

export const KvGetParamsSchema = z.strictObject({
  ...chatIdSchema,
  keys: z.array(z.string().min(1).max(KV_KEY_MAX)).optional(),
})

export const KvSetParamsSchema = z.strictObject({
  ...chatIdSchema,
  entries: z.record(z.string().min(1).max(KV_KEY_MAX), jsonValueSchema.nullable()),
})

export const KvClearParamsSchema = z.strictObject(chatIdSchema)

export const BotMethods = {
  getMe: {
    params: EmptyParamsSchema,
    result: BotRefSchema,
  },
  setCommands: {
    params: SetCommandsParamsSchema,
    result: OkResultSchema,
  },
  setRoles: {
    params: SetRolesParamsSchema,
    result: OkResultSchema,
  },
  sendMessage: {
    params: SendMessageParamsSchema,
    result: MessageSchema,
  },
  editMessage: {
    params: EditMessageParamsSchema,
    result: MessageSchema,
  },
  deleteMessage: {
    params: DeleteMessageParamsSchema,
    result: OkResultSchema,
  },
  answerCallback: {
    params: AnswerCallbackParamsSchema,
    result: OkResultSchema,
  },
  sendTyping: {
    params: SendTypingParamsSchema,
    result: OkResultSchema,
  },
  setChatRoles: {
    params: SetChatRolesParamsSchema,
    result: OkResultSchema,
  },
  kvGet: {
    params: KvGetParamsSchema,
    result: z.record(z.string(), jsonValueSchema),
  },
  kvSet: {
    params: KvSetParamsSchema,
    result: z.strictObject({ used: z.int().nonnegative() }),
  },
  kvClear: {
    params: KvClearParamsSchema,
    result: OkResultSchema,
  },
} as const

export const BOT_METHOD_NAMES = [
  'getMe',
  'setCommands',
  'setRoles',
  'sendMessage',
  'editMessage',
  'deleteMessage',
  'answerCallback',
  'sendTyping',
  'setChatRoles',
  'kvGet',
  'kvSet',
  'kvClear',
] as const

export const BotMethodNameSchema = z.enum(BOT_METHOD_NAMES)

export type BotMethod = keyof typeof BotMethods
export type BotMethodName = BotMethod
export type Params<Method extends BotMethod> = z.infer<(typeof BotMethods)[Method]['params']>
export type Result<Method extends BotMethod> = z.infer<(typeof BotMethods)[Method]['result']>

const requestFields = { t: z.literal('req'), id: idSchema }

export const GetMeRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('getMe'),
  params: EmptyParamsSchema,
})
export const SetCommandsRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('setCommands'),
  params: SetCommandsParamsSchema,
})
export const SetRolesRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('setRoles'),
  params: SetRolesParamsSchema,
})
export const SendMessageRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('sendMessage'),
  params: SendMessageParamsSchema,
})
export const EditMessageRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('editMessage'),
  params: EditMessageParamsSchema,
})
export const DeleteMessageRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('deleteMessage'),
  params: DeleteMessageParamsSchema,
})
export const AnswerCallbackRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('answerCallback'),
  params: AnswerCallbackParamsSchema,
})
export const SendTypingRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('sendTyping'),
  params: SendTypingParamsSchema,
})
export const SetChatRolesRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('setChatRoles'),
  params: SetChatRolesParamsSchema,
})
export const KvGetRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('kvGet'),
  params: KvGetParamsSchema,
})
export const KvSetRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('kvSet'),
  params: KvSetParamsSchema,
})
export const KvClearRequestFrameSchema = z.strictObject({
  ...requestFields,
  method: z.literal('kvClear'),
  params: KvClearParamsSchema,
})

export const BotRequestFrameSchema = z.discriminatedUnion('method', [
  GetMeRequestFrameSchema,
  SetCommandsRequestFrameSchema,
  SetRolesRequestFrameSchema,
  SendMessageRequestFrameSchema,
  EditMessageRequestFrameSchema,
  DeleteMessageRequestFrameSchema,
  AnswerCallbackRequestFrameSchema,
  SendTypingRequestFrameSchema,
  SetChatRolesRequestFrameSchema,
  KvGetRequestFrameSchema,
  KvSetRequestFrameSchema,
  KvClearRequestFrameSchema,
])

export const BotResponseFrameSchema = z.discriminatedUnion('ok', [
  z.strictObject({
    t: z.literal('res'),
    id: idSchema,
    ok: z.literal(true),
    result: jsonValueSchema,
  }),
  z.strictObject({
    t: z.literal('res'),
    id: idSchema,
    ok: z.literal(false),
    error: z.strictObject({ code: ErrorCodeSchema, message: z.string().min(1) }),
  }),
])

export const HelloFrameSchema = z.strictObject({
  t: z.literal('hello'),
  protocol: z.literal(1),
  bot: BotRefSchema,
  commands: z.array(BotCommandSchema),
})

export const BotEventFrameSchema = z.strictObject({
  t: z.literal('evt'),
  seq: z.int().positive(),
  event: BotEventSchema,
})

export const AckFrameSchema = z.strictObject({
  t: z.literal('ack'),
  seq: z.int().positive(),
})

export const ServerToBotFrameSchema = z.union([
  HelloFrameSchema,
  BotResponseFrameSchema,
  BotEventFrameSchema,
])
export const BotToServerFrameSchema = z.union([BotRequestFrameSchema, AckFrameSchema])

export type BotRequestFrame = z.infer<typeof BotRequestFrameSchema>
export type BotResponseFrame = z.infer<typeof BotResponseFrameSchema>
export type HelloFrame = z.infer<typeof HelloFrameSchema>
export type BotEventFrame = z.infer<typeof BotEventFrameSchema>
export type AckFrame = z.infer<typeof AckFrameSchema>
export type ServerToBotFrame = z.infer<typeof ServerToBotFrameSchema>
export type BotToServerFrame = z.infer<typeof BotToServerFrameSchema>
