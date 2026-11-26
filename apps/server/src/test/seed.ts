import { type Message, MessageContentSchema, UserContentSchema } from '@appercot/protocol'
import { asc, eq } from 'drizzle-orm'
import { createBotToken } from '../auth/bot-token'
import { bootstrapAuth } from '../auth/password'
import { hashToken } from '../auth/tokens'
import type { AppDatabase } from '../db/client'
import {
  botCommands,
  botEvents,
  bots,
  chats,
  invites,
  messages,
  users,
  userUpdates,
} from '../db/schema'
import { toMessageDto } from '../domain/message-dto'
import type { AppEnv } from '../env'
import type { TestConfig } from './config'

export interface TestUserFixture {
  id: string
  username: string
  displayName: string
  password: string
}

export interface TestBotFixture {
  id: string
  username: string
  name: string
  ownerId: string | null
  token: string
}

export interface TestChatFixture {
  id: string
  userId: string
  botId: string
}

export interface TestManifest {
  admin: TestUserFixture | null
  users: TestUserFixture[]
  bots: TestBotFixture[]
  chats: Array<TestChatFixture & { messages: Message[] }>
}

export interface TestSnapshot {
  invites: Array<typeof invites.$inferSelect>
  users: Array<typeof users.$inferSelect>
  bots: Array<typeof bots.$inferSelect>
  commands: Array<typeof botCommands.$inferSelect>
  chats: Array<typeof chats.$inferSelect>
  messages: Array<typeof messages.$inferSelect>
}

export interface TestBaseline {
  manifest: TestManifest
  snapshot: TestSnapshot
  fixtures: () => TestManifest
}

const clone = <Value>(value: Value): Value => structuredClone(value)

export const seedTestFixtures = (
  db: AppDatabase,
  env: AppEnv,
  config: TestConfig,
): TestBaseline => {
  const seeded = db.transaction((transaction) => {
    if (
      transaction.select().from(users).all().length > 0 ||
      transaction.select().from(bots).all().length > 0 ||
      transaction.select().from(chats).all().length > 0
    ) {
      throw new Error('Test fixtures can only seed an empty database')
    }
    bootstrapAuth(transaction, env)
    const now = Date.now()
    const userRows = new Map<string, typeof users.$inferSelect>()
    const userCredentials = new Map<string, string>()
    const administrator = env.ADMIN_USERNAME
      ? transaction.select().from(users).where(eq(users.username, env.ADMIN_USERNAME)).get()
      : undefined
    if (administrator) {
      userRows.set(administrator.username, administrator)
      if (env.ADMIN_PASSWORD) userCredentials.set(administrator.id, env.ADMIN_PASSWORD)
    }

    for (const user of config.users) {
      if (userRows.has(user.username))
        throw new Error(`Duplicate seeded username at users.${user.username}`)
      const id = user.id ?? Bun.randomUUIDv7()
      transaction
        .insert(users)
        .values({
          id,
          username: user.username,
          displayName: user.displayName,
          passwordHash: Bun.password.hashSync(user.password, { algorithm: 'argon2id' }),
          createdAt: now,
        })
        .run()
      const row = transaction.select().from(users).where(eq(users.id, id)).get()
      if (!row) throw new Error('Seeded user was not persisted')
      userRows.set(row.username, row)
      userCredentials.set(id, user.password)
    }

    const botRows = new Map<string, typeof bots.$inferSelect>()
    const botCredentials = new Map<string, string>()
    for (const bot of config.bots) {
      const tokenPrefix = bot.token?.split(':', 1)[0]
      const id = bot.id ?? tokenPrefix ?? Bun.randomUUIDv7()
      const credential = bot.token
        ? { token: bot.token, hash: hashToken(bot.token) }
        : createBotToken(id)
      const ownerId = bot.owner ? userRows.get(bot.owner)?.id : null
      if (bot.owner && !ownerId) throw new Error(`Unknown owner at bots.${bot.username}.owner`)
      transaction
        .insert(bots)
        .values({
          id,
          username: bot.username,
          name: bot.name,
          description: bot.description,
          welcome: bot.welcome,
          tags: bot.tags,
          ownerId: ownerId ?? null,
          tokenHash: credential.hash,
          listed: bot.listed,
          guestAccess: bot.guestAccess,
          access: bot.access,
          roles: bot.roles.map(({ code }) => code),
          roleLabels: Object.fromEntries(bot.roles.map(({ code, name }) => [code, name])),
          defaultRoles: bot.defaultRoles,
          commandsRev: bot.commands.length ? 1 : 0,
          createdAt: now,
        })
        .run()
      if (bot.commands.length) {
        transaction
          .insert(botCommands)
          .values(
            bot.commands.map((command, sort) => ({
              botId: id,
              name: command.name,
              description: command.description,
              roles: command.roles ?? null,
              shortcut: command.shortcut ?? null,
              sort,
            })),
          )
          .run()
      }
      const row = transaction.select().from(bots).where(eq(bots.id, id)).get()
      if (!row) throw new Error('Seeded bot was not persisted')
      botRows.set(row.username, row)
      botCredentials.set(id, credential.token)
    }

    const chatRows: Array<typeof chats.$inferSelect> = []
    const messageRows: Array<typeof messages.$inferSelect> = []
    for (const [chatIndex, chat] of config.chats.entries()) {
      const user = userRows.get(chat.user)
      const bot = botRows.get(chat.bot)
      if (!user || !bot) throw new Error(`Unknown chat reference at chats.${chatIndex}`)
      const id = chat.id ?? Bun.randomUUIDv7()
      const history = chat.messages.map((message, messageIndex) => ({
        id: message.id ?? Bun.randomUUIDv7(),
        chatId: id,
        seq: messageIndex + 1,
        sender: message.sender,
        content:
          message.sender === 'user'
            ? UserContentSchema.parse(message.content)
            : MessageContentSchema.parse(message.content),
        status: 'processed' as const,
        clientId: message.clientId ?? null,
        createdAt: now + messageIndex,
      }))
      transaction
        .insert(chats)
        .values({
          id,
          userId: user.id,
          botId: bot.id,
          roles: [...chat.roles, ...bot.defaultRoles, 'user']
            .filter((role) => bot.roles.includes(role))
            .slice(0, 1),
          notifications: chat.notifications,
          notificationsMutedUntil: chat.notificationsMutedUntil,
          lastMessageAt: history.at(-1)?.createdAt ?? null,
          nextSeq: history.length + 1,
          createdAt: now + chatIndex,
        })
        .run()
      if (history.length) transaction.insert(messages).values(history).run()
      const row = transaction.select().from(chats).where(eq(chats.id, id)).get()
      if (!row) throw new Error('Seeded chat was not persisted')
      chatRows.push(row)
      messageRows.push(
        ...transaction
          .select()
          .from(messages)
          .where(eq(messages.chatId, id))
          .orderBy(asc(messages.seq))
          .all(),
      )
    }
    if (
      transaction.select().from(botEvents).all().length ||
      transaction.select().from(userUpdates).all().length
    )
      throw new Error('Seed must not create runtime events')
    return { userCredentials, botCredentials, chatRows, messageRows }
  })

  const snapshot: TestSnapshot = {
    invites: db.select().from(invites).all(),
    users: db.select().from(users).all(),
    bots: db.select().from(bots).all(),
    commands: db.select().from(botCommands).all(),
    chats: db.select().from(chats).all(),
    messages: db.select().from(messages).orderBy(asc(messages.createdAt), asc(messages.id)).all(),
  }
  const adminRow = env.ADMIN_USERNAME
    ? snapshot.users.find((user) => user.username === env.ADMIN_USERNAME)
    : undefined
  const manifest: TestManifest = {
    admin: adminRow
      ? {
          id: adminRow.id,
          username: adminRow.username,
          displayName: adminRow.displayName,
          password: seeded.userCredentials.get(adminRow.id) ?? '',
        }
      : null,
    users: config.users.map((input) => {
      const row = snapshot.users.find((user) => user.username === input.username)
      if (!row) throw new Error('Seeded user is missing from baseline')
      return {
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        password: seeded.userCredentials.get(row.id) ?? input.password,
      }
    }),
    bots: config.bots.map((input) => {
      const row = snapshot.bots.find((bot) => bot.username === input.username)
      if (!row) throw new Error('Seeded bot is missing from baseline')
      return {
        id: row.id,
        username: row.username,
        name: row.name,
        ownerId: row.ownerId,
        token: seeded.botCredentials.get(row.id) ?? '',
      }
    }),
    chats: seeded.chatRows.map((chat) => ({
      id: chat.id,
      userId: chat.userId,
      botId: chat.botId,
      messages: seeded.messageRows
        .filter((message) => message.chatId === chat.id)
        .map(toMessageDto),
    })),
  }
  const immutableManifest = clone(manifest)
  const immutableSnapshot = clone(snapshot)
  return {
    manifest: immutableManifest,
    snapshot: immutableSnapshot,
    fixtures: () => clone(immutableManifest),
  }
}
