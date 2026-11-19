import {
  BotCommandSchema,
  BotRoleSchema,
  MessageContentSchema,
  RESERVED_BOT_ROLES,
  UserContentSchema,
} from '@appercot/protocol'
import { z } from 'zod'

const id = z.string().regex(/^[a-zA-Z0-9-]+$/)
const username = z.string().regex(/^[a-zA-Z0-9_]{3,32}$/)
const password = z.string().min(8).max(256)

const LaunchFields = {
  server: z
    .strictObject({
      hostname: z.string().min(1).optional(),
      port: z.number().int().min(0).max(65535).optional(),
      dataDir: z.string().min(1).optional(),
      publicDir: z.string().min(1).optional(),
      publicUrl: z.url().optional(),
    })
    .optional(),
  registration: z
    .strictObject({ enabled: z.boolean().optional(), userInvites: z.boolean().optional() })
    .optional(),
  admin: z.strictObject({ username: username, password }).optional(),
  bootstrapInvite: z.string().min(1).optional(),
  media: z
    .strictObject({
      maxBytes: z
        .number()
        .int()
        .min(0)
        .max(5 * 1024 ** 4)
        .optional(),
      uploadsPerActor: z.number().int().min(1).max(32).optional(),
      originalsPerUser: z.number().int().min(1).max(64).optional(),
      trustedHosts: z.array(z.string().min(1)).optional(),
      ffmpeg: z.string().min(1).optional(),
    })
    .optional(),
  s3: z
    .strictObject({
      endpoint: z.url({ protocol: /^https?$/ }).optional(),
      bucket: z.string().min(3).optional(),
      region: z.string().min(1).optional(),
      accessKeyId: z.string().min(1).optional(),
      secretAccessKey: z.string().min(1).optional(),
    })
    .optional(),
  vapid: z.strictObject({ publicKey: z.string().min(1), privateKey: z.string().min(1) }).optional(),
  nodeEnv: z.enum(['development', 'test', 'production']).optional(),
}

const UserConfigSchema = z.strictObject({
  id: id.optional(),
  username,
  displayName: z.string().trim().min(1).max(100),
  password,
})

const CommandSchema = BotCommandSchema
const RoleSchema = BotRoleSchema

const BotConfigSchema = z.strictObject({
  id: id.optional(),
  username: z.string().regex(/^[a-z][a-z0-9_]{2,31}bot$/),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(''),
  welcome: z.string().max(2000).default(''),
  owner: z.string().min(1).optional(),
  token: z.string().min(3).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  listed: z.boolean().default(true),
  access: z.enum(['public', 'by_link']).default('public'),
  guestAccess: z.boolean().default(false),
  roles: z.array(RoleSchema).max(100).default([]),
  defaultRoles: z.array(z.string().min(1)).max(1).default([]),
  commands: z.array(CommandSchema).max(100).default([]),
})

const MessageConfigSchema = z.strictObject({
  id: id.optional(),
  sender: z.enum(['user', 'bot']),
  content: z.unknown(),
  clientId: z.string().min(1).max(128).optional(),
})

const ChatConfigSchema = z.strictObject({
  id: id.optional(),
  user: z.string().min(1),
  bot: z.string().min(1),
  roles: z.array(z.string().min(1)).max(1).default([]),
  notifications: z.enum(['all', 'silent', 'off']).default('all'),
  messages: z.array(MessageConfigSchema).default([]),
})

export const ServerConfigSchema = z.strictObject({ ...LaunchFields })
export type ServerConfig = z.infer<typeof ServerConfigSchema>

export const TestConfigSchema = z
  .strictObject({
    ...LaunchFields,
    users: z.array(UserConfigSchema).default([]),
    bots: z.array(BotConfigSchema).default([]),
    chats: z.array(ChatConfigSchema).default([]),
    test: z.strictObject({ token: z.string().min(1) }),
  })
  .superRefine((config, context) => {
    const issue = (path: Array<string | number>, message: string) =>
      context.addIssue({ code: 'custom', path, message })
    const userNames = new Set<string>()
    const userIds = new Set<string>()
    if (config.admin) userNames.add(config.admin.username)
    for (const [index, user] of config.users.entries()) {
      if (userNames.has(user.username)) issue(['users', index, 'username'], 'Duplicate username')
      userNames.add(user.username)
      if (user.id) {
        if (userIds.has(user.id)) issue(['users', index, 'id'], 'Duplicate user ID')
        userIds.add(user.id)
      }
    }

    const botNames = new Set<string>()
    const botIds = new Set<string>()
    for (const [index, bot] of config.bots.entries()) {
      if (botNames.has(bot.username)) issue(['bots', index, 'username'], 'Duplicate username')
      botNames.add(bot.username)
      if (bot.id) {
        if (botIds.has(bot.id)) issue(['bots', index, 'id'], 'Duplicate bot ID')
        botIds.add(bot.id)
      }
      if (bot.owner && !userNames.has(bot.owner))
        issue(['bots', index, 'owner'], 'Unknown owner username')
      if (bot.token) {
        const separator = bot.token.indexOf(':')
        if (separator < 1 || separator === bot.token.length - 1)
          issue(['bots', index, 'token'], 'Bot token must use <botId>:<secret> format')
        else if (bot.id && bot.token.slice(0, separator) !== bot.id)
          issue(['bots', index, 'token'], 'Bot token prefix must match the explicit bot ID')
      }
      const roleCodes = new Set<string>()
      for (const [roleIndex, role] of bot.roles.entries()) {
        if (roleCodes.has(role.code) || RESERVED_BOT_ROLES.includes(role.code))
          issue(['bots', index, 'roles', roleIndex, 'code'], 'Duplicate or reserved role code')
        roleCodes.add(role.code)
      }
      for (const role of bot.defaultRoles) {
        if (!roleCodes.has(role)) issue(['bots', index, 'defaultRoles'], 'Unknown default role')
      }
      const commandNames = new Set<string>()
      const commandRoles = new Set([...roleCodes, ...RESERVED_BOT_ROLES, 'all', 'authenticated'])
      for (const [commandIndex, command] of bot.commands.entries()) {
        if (commandNames.has(command.name))
          issue(['bots', index, 'commands', commandIndex, 'name'], 'Duplicate command name')
        commandNames.add(command.name)
        if (command.roles?.some((role) => !commandRoles.has(role)))
          issue(['bots', index, 'commands', commandIndex, 'roles'], 'Unknown command role')
      }
    }

    const chatIds = new Set<string>()
    const messageIds = new Set<string>()
    const pairs = new Set<string>()
    for (const [index, chat] of config.chats.entries()) {
      if (chat.id) {
        if (chatIds.has(chat.id)) issue(['chats', index, 'id'], 'Duplicate chat ID')
        chatIds.add(chat.id)
      }
      if (!userNames.has(chat.user)) issue(['chats', index, 'user'], 'Unknown user username')
      if (!botNames.has(chat.bot)) issue(['chats', index, 'bot'], 'Unknown bot username')
      const pair = `${chat.user}\0${chat.bot}`
      if (pairs.has(pair)) issue(['chats', index], 'Duplicate user-bot chat')
      pairs.add(pair)
      const bot = config.bots.find((candidate) => candidate.username === chat.bot)
      if (chat.roles.some((role) => !bot?.roles.some((definition) => definition.code === role)))
        issue(['chats', index, 'roles'], 'Unknown membership role')
      for (const [messageIndex, message] of chat.messages.entries()) {
        if (message.id) {
          if (messageIds.has(message.id))
            issue(['chats', index, 'messages', messageIndex, 'id'], 'Duplicate message ID')
          messageIds.add(message.id)
        }
        const schema = message.sender === 'user' ? UserContentSchema : MessageContentSchema
        const parsed = schema.safeParse(message.content)
        if (!parsed.success)
          issue(
            ['chats', index, 'messages', messageIndex, 'content'],
            `Invalid ${message.sender} message content`,
          )
      }
    }
  })

export type TestConfig = z.infer<typeof TestConfigSchema>
