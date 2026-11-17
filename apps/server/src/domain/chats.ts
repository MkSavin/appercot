import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botCommands, botEvents, bots, chats, messages, users } from '../db/schema'
import type { Hub } from '../ws/hub'
import { toBotDto } from './bots'
import { filterCommandsByRoles, listVisibleCommands, type VisibleCommand } from './commands'
import { DomainError } from './errors'
import { enqueueBotEvent } from './events'
import { createSystemMessage } from './system-messages'
import { pushUserUpdate } from './updates'

export const getChatForBot = (db: AppDatabase, chatId: string, botId: string) => {
  const result = db
    .select({ chat: chats, user: users })
    .from(chats)
    .innerJoin(users, eq(users.id, chats.userId))
    .where(eq(chats.id, chatId))
    .get()
  if (!result || result.chat.botId !== botId) {
    throw new DomainError('NOT_FOUND', 'Chat was not found')
  }
  return result
}

export const getChatForUser = (db: AppDatabase, chatId: string, userId: string) => {
  const result = db
    .select({ chat: chats, user: users, bot: bots })
    .from(chats)
    .innerJoin(users, eq(users.id, chats.userId))
    .innerJoin(bots, eq(bots.id, chats.botId))
    .where(eq(chats.id, chatId))
    .get()
  if (!result || result.chat.userId !== userId) {
    throw new DomainError('FORBIDDEN', 'Chat does not belong to the user')
  }
  return result
}

export const toChatRef = (chat: typeof chats.$inferSelect) => ({
  id: chat.id,
  roles: chat.roles,
  blocked: chat.blockedAt !== null,
  createdAt: chat.createdAt,
})

export const toUserRef = (user: typeof users.$inferSelect) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
})

export const toConnectionDto = (
  chat: typeof chats.$inferSelect,
  bot: typeof bots.$inferSelect,
  hub: Hub,
  commands: VisibleCommand[] = [],
) => ({
  id: chat.id,
  bot: toBotDto(bot, hub),
  roles: chat.roles,
  blocked: chat.blockedAt !== null,
  unread: Math.max(0, chat.nextSeq - 1 - chat.lastReadSeq),
  lastMessageAt: chat.lastMessageAt,
  createdAt: chat.createdAt,
  commands,
})

export const toClientChatDto = (...args: Parameters<typeof toConnectionDto>) => {
  const { id, bot, roles, blocked, unread, lastMessageAt, createdAt } = toConnectionDto(...args)
  return { id, bot, roles, blocked, unread, lastMessageAt, createdAt }
}

export const listUserChats = (db: AppDatabase, hub: Hub, userId: string) => {
  const rows = db
    .select({ chat: chats, bot: bots })
    .from(chats)
    .innerJoin(bots, eq(bots.id, chats.botId))
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.lastMessageAt), desc(chats.createdAt))
    .all()
  const botIds = [...new Set(rows.map((row) => row.bot.id))]
  const commands = botIds.length
    ? db
        .select()
        .from(botCommands)
        .where(inArray(botCommands.botId, botIds))
        .orderBy(asc(botCommands.sort), asc(botCommands.name))
        .all()
    : []
  return rows.map((row) =>
    toConnectionDto(
      row.chat,
      row.bot,
      hub,
      filterCommandsByRoles(
        commands.filter((command) => command.botId === row.bot.id),
        row.chat.roles,
      ),
    ),
  )
}

export const addBot = (db: AppDatabase, hub: Hub, userId: string, username: string) => {
  const bot = db.select().from(bots).where(eq(bots.username, username)).get()
  if (!bot?.listed || bot.access !== 'public') {
    throw new DomainError('NOT_FOUND', 'Bot was not found')
  }
  const existing = db
    .select()
    .from(chats)
    .where(and(eq(chats.userId, userId), eq(chats.botId, bot.id)))
    .get()
  if (existing) {
    return toConnectionDto(existing, bot, hub, listVisibleCommands(db, bot.id, existing.roles))
  }

  const now = Date.now()
  const chatId = Bun.randomUUIDv7()
  db.insert(chats)
    .values({
      id: chatId,
      userId,
      botId: bot.id,
      roles: bot.defaultRoles,
      lastReadSeq: 0,
      nextSeq: 1,
      createdAt: now,
    })
    .run()
  const created = getChatForUser(db, chatId, userId)
  const commands = listVisibleCommands(db, bot.id, created.chat.roles)
  enqueueBotEvent(
    db,
    {
      botId: bot.id,
      chatId,
      event: { type: 'chat_started', chat: toChatRef(created.chat), user: toUserRef(created.user) },
    },
    hub,
  )
  pushUserUpdate(db, hub, userId, {
    type: 'chat.updated',
    chat: toClientChatDto(created.chat, bot, hub),
  })
  return toConnectionDto(created.chat, bot, hub, commands)
}

export const markChatRead = (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  chatId: string,
  seq: number,
) => {
  const { chat, bot } = getChatForUser(db, chatId, userId)
  const lastReadSeq = Math.min(Math.max(0, seq), chat.nextSeq - 1)
  db.update(chats).set({ lastReadSeq }).where(eq(chats.id, chatId)).run()
  const updated = getChatForUser(db, chatId, userId)
  pushUserUpdate(db, hub, userId, {
    type: 'chat.updated',
    chat: toClientChatDto(updated.chat, bot, hub),
  })
  return true
}

export const setChatBlocked = (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  chatId: string,
  blocked: boolean,
) => {
  const current = getChatForUser(db, chatId, userId)
  const blockedAt = blocked ? Date.now() : null
  if ((current.chat.blockedAt !== null) === blocked) return true
  db.update(chats).set({ blockedAt }).where(eq(chats.id, chatId)).run()
  const updated = getChatForUser(db, chatId, userId)
  enqueueBotEvent(
    db,
    {
      botId: updated.bot.id,
      chatId,
      event: {
        type: blocked ? 'bot_blocked' : 'bot_unblocked',
        chat: toChatRef(updated.chat),
        user: toUserRef(updated.user),
      },
    },
    hub,
  )
  pushUserUpdate(db, hub, userId, {
    type: 'chat.updated',
    chat: toClientChatDto(updated.chat, updated.bot, hub),
  })
  if (blocked) createSystemMessage(db, hub, chatId, 'Бот заблокирован')
  return true
}

export const clearChat = (db: AppDatabase, hub: Hub, userId: string, chatId: string) => {
  const current = getChatForUser(db, chatId, userId)
  db.transaction((transaction) => {
    transaction.delete(botEvents).where(eq(botEvents.chatId, chatId)).run()
    transaction.delete(messages).where(eq(messages.chatId, chatId)).run()
  })
  enqueueBotEvent(
    db,
    {
      botId: current.bot.id,
      chatId,
      event: {
        type: 'chat_cleared',
        chat: toChatRef(current.chat),
        user: toUserRef(current.user),
      },
    },
    hub,
  )
  pushUserUpdate(db, hub, userId, { type: 'chat.cleared', chatId })
  return true
}
