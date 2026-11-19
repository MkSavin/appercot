import { MessageContentSchema } from '@appercot/protocol'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { createBotToken } from '../auth/bot-token'
import { hashPassword } from '../auth/password'
import { bots, chats, users } from '../db/schema'
import { joinBotMembership } from '../domain/chats'
import { sendBotMessage, sendUserMessage } from '../domain/messages'
import { fixtureConflict, fixtureNotFound } from './errors'
import { createTestResetService, type TestResetOptions } from './reset'

const id = z
  .string()
  .regex(/^[a-zA-Z0-9-]+$/)
  .optional()

export const CreateTestUserSchema = z.strictObject({
  id,
  username: z.string().regex(/^[a-zA-Z0-9_]{3,32}$/),
  displayName: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(256),
})

export const CreateTestBotSchema = z.strictObject({
  id,
  username: z.string().regex(/^[a-z][a-z0-9_]{2,31}bot$/),
  name: z.string().trim().min(1).max(100),
  ownerId: z.string().min(1),
  description: z.string().trim().max(1000).default(''),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  listed: z.boolean().default(true),
  access: z.enum(['public', 'by_link']).default('public'),
  defaultRoles: z.array(z.string().min(1)).max(1).default([]),
})

export const CreateTestChatSchema = z.strictObject({
  id,
  userId: z.string().min(1),
  botId: z.string().min(1),
})

export const SendTestMessageSchema = z.discriminatedUnion('sender', [
  z.strictObject({
    chatId: z.string().min(1),
    sender: z.literal('user'),
    clientId: z.string().min(1).max(128),
    content: z.unknown(),
  }),
  z.strictObject({
    chatId: z.string().min(1),
    sender: z.literal('bot'),
    clientId: z.string().min(1).max(128).optional(),
    content: z.unknown(),
  }),
])

export const createTestFixtureOperations = (options: TestResetOptions) => {
  const { db, hub, baseline } = options
  const reset = createTestResetService(options)
  return {
    fixtures: () => baseline.fixtures(),

    async createUser(rawInput: z.input<typeof CreateTestUserSchema>) {
      const input = CreateTestUserSchema.parse(rawInput)
      if (db.select().from(users).where(eq(users.username, input.username)).get())
        throw fixtureConflict('Username is already in use', '/username')
      const userId = input.id ?? Bun.randomUUIDv7()
      if (db.select().from(users).where(eq(users.id, userId)).get())
        throw fixtureConflict('User ID is already in use', '/id')
      const passwordHash = await hashPassword(input.password)
      const user = db
        .insert(users)
        .values({
          id: userId,
          username: input.username,
          displayName: input.displayName,
          passwordHash,
          createdAt: Date.now(),
        })
        .returning()
        .get()
      if (!user) throw new Error('Unable to create fixture user')
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        password: input.password,
      }
    },

    createBot(rawInput: z.input<typeof CreateTestBotSchema>) {
      const input = CreateTestBotSchema.parse(rawInput)
      if (!db.select().from(users).where(eq(users.id, input.ownerId)).get())
        throw fixtureNotFound('User', input.ownerId)
      if (db.select().from(bots).where(eq(bots.username, input.username)).get())
        throw fixtureConflict('Bot username is already in use', '/username')
      if (input.defaultRoles.length)
        throw fixtureConflict('Runtime bots have no registered custom roles', '/defaultRoles')
      const botId = input.id ?? Bun.randomUUIDv7()
      if (db.select().from(bots).where(eq(bots.id, botId)).get())
        throw fixtureConflict('Bot ID is already in use', '/id')
      const credential = createBotToken(botId)
      const bot = db
        .insert(bots)
        .values({
          id: botId,
          username: input.username,
          name: input.name,
          description: input.description,
          tags: input.tags,
          ownerId: input.ownerId,
          tokenHash: credential.hash,
          listed: input.listed,
          access: input.access,
          defaultRoles: [],
          createdAt: Date.now(),
        })
        .returning()
        .get()
      if (!bot) throw new Error('Unable to create fixture bot')
      return {
        id: bot.id,
        username: bot.username,
        name: bot.name,
        ownerId: bot.ownerId,
        token: credential.token,
      }
    },

    createChat(rawInput: z.input<typeof CreateTestChatSchema>) {
      const input = CreateTestChatSchema.parse(rawInput)
      const user = db.select().from(users).where(eq(users.id, input.userId)).get()
      const bot = db.select().from(bots).where(eq(bots.id, input.botId)).get()
      if (!user) throw fixtureNotFound('User', input.userId)
      if (!bot) throw fixtureNotFound('Bot', input.botId)
      const connection = joinBotMembership(db, hub, user.id, bot, {
        canJoin: true,
        roles: [],
        ...(input.id ? { id: input.id } : {}),
      })
      const chat = db
        .select()
        .from(chats)
        .where(and(eq(chats.id, connection.id), eq(chats.userId, user.id)))
        .get()
      if (!chat) throw new Error('Unable to create fixture chat')
      return { id: chat.id, userId: chat.userId, botId: chat.botId }
    },

    sendMessage(rawInput: z.input<typeof SendTestMessageSchema>) {
      const input = SendTestMessageSchema.parse(rawInput)
      const chat = db.select().from(chats).where(eq(chats.id, input.chatId)).get()
      if (!chat) throw fixtureNotFound('Chat', input.chatId)
      if (input.sender === 'user') {
        return sendUserMessage(db, hub, chat.userId, {
          chatId: chat.id,
          clientId: input.clientId,
          content: input.content,
        })
      }
      return sendBotMessage(db, hub, chat.botId, {
        chatId: chat.id,
        content: MessageContentSchema.parse(input.content),
      })
    },

    ...reset,
  }
}

export type TestFixtureOperations = ReturnType<typeof createTestFixtureOperations>
