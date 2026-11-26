import type { Message } from '@appercot/protocol'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { hashToken } from '../auth/tokens'
import type { AppDatabase } from '../db/client'
import {
  botCommands,
  botEvents,
  botInvites,
  botInviteUses,
  bots,
  chatKv,
  chats,
  files,
  messages,
  users,
  userUpdates,
} from '../db/schema'
import type { Hub } from '../ws/hub'
import { toBotDto } from './bots'
import { filterCommandsByRoles, listVisibleCommands, type VisibleCommand } from './commands'
import { DomainError } from './errors'
import { enqueueBotEvent, flushBotEvents } from './events'
import { toMessageDto } from './message-dto'
import { createSystemMessage } from './system-messages'
import { pushUserUpdate } from './updates'

export const getChatForBot = (db: AppDatabase, chatId: string, botId: string) => {
  const result = db
    .select({ chat: chats, user: users, bot: bots })
    .from(chats)
    .innerJoin(users, eq(users.id, chats.userId))
    .innerJoin(bots, eq(bots.id, chats.botId))
    .where(eq(chats.id, chatId))
    .get()
  if (
    !result ||
    result.chat.botId !== botId ||
    result.chat.revokedAt !== null ||
    (result.chat.guest &&
      (!result.bot.guestAccess ||
        result.bot.access !== 'public' ||
        (result.user.guestUntil ?? 0) <= Date.now()))
  ) {
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
  if (!result || result.chat.userId !== userId || result.chat.revokedAt !== null) {
    throw new DomainError('FORBIDDEN', 'Chat does not belong to the user')
  }
  return result
}

export const toChatRef = (
  chat: typeof chats.$inferSelect,
  bot: Pick<typeof bots.$inferSelect, 'ownerId' | 'roles'>,
) => ({
  id: chat.id,
  roles: chat.guest
    ? ['guest']
    : bot.ownerId === chat.userId
      ? ['owner']
      : chat.roles.filter((role) => bot.roles.includes(role)).slice(0, 1),
  blocked: chat.blockedAt !== null || chat.revokedAt !== null,
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
  preview: Message | null = null,
) => ({
  id: chat.id,
  bot: toBotDto(bot, hub),
  roles: toChatRef(chat, bot).roles,
  blocked: chat.blockedAt !== null,
  unread: Math.max(0, chat.nextSeq - 1 - chat.lastReadSeq),
  lastMessageAt: chat.lastMessageAt,
  createdAt: chat.createdAt,
  commands,
  notifications: chat.notifications,
  notificationsMutedUntil: chat.notificationsMutedUntil,
  preview,
})

export const toClientChatDto = (...args: Parameters<typeof toConnectionDto>) => {
  const {
    id,
    bot,
    roles,
    blocked,
    unread,
    lastMessageAt,
    createdAt,
    commands,
    notifications,
    notificationsMutedUntil,
    preview,
  } = toConnectionDto(...args)
  const { access: _access, guestAccess: _guestAccess, ...clientBot } = bot
  return {
    id,
    bot: clientBot,
    roles,
    blocked,
    unread,
    lastMessageAt,
    createdAt,
    commands: args[3] ? commands : undefined,
    notifications,
    notificationsMutedUntil,
    preview,
  }
}

export const publishBotChatConfiguration = (
  db: AppDatabase,
  hub: Hub,
  bot: typeof bots.$inferSelect,
) => {
  const connections = db
    .select()
    .from(chats)
    .where(and(eq(chats.botId, bot.id), isNull(chats.revokedAt)))
    .all()
  for (const chat of connections) publishChatCommands(db, hub, chat, bot)
}

export const publishChatCommands = (
  db: AppDatabase,
  hub: Hub,
  chat: typeof chats.$inferSelect,
  bot: typeof bots.$inferSelect,
) => {
  if (chat.hiddenAt !== null || chat.guest) return
  pushUserUpdate(db, hub, chat.userId, {
    type: 'chat.updated',
    chat: toClientChatDto(
      chat,
      bot,
      hub,
      listVisibleCommands(db, bot.id, toChatRef(chat, bot).roles),
    ),
  })
}

export const listUserChats = (db: AppDatabase, hub: Hub, userId: string) => {
  const rows = db
    .select({ chat: chats, bot: bots })
    .from(chats)
    .innerJoin(bots, eq(bots.id, chats.botId))
    .where(and(eq(chats.userId, userId), isNull(chats.revokedAt), isNull(chats.hiddenAt)))
    .orderBy(desc(chats.lastMessageAt), desc(chats.createdAt))
    .all()
  const previewRows = rows.length
    ? db
        .select()
        .from(messages)
        .where(
          and(
            inArray(
              messages.chatId,
              rows.map((row) => row.chat.id),
            ),
            isNull(messages.deletedAt),
            sql`${messages.seq} = (
              select max("preview_messages"."seq")
              from "messages" as "preview_messages"
              where "preview_messages"."chat_id" = ${messages.chatId}
                and "preview_messages"."deleted_at" is null
            )`,
          ),
        )
        .all()
    : []
  const previews = new Map(previewRows.map((message) => [message.chatId, toMessageDto(message)]))
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
        toChatRef(row.chat, row.bot).roles,
      ),
      previews.get(row.chat.id) ?? null,
    ),
  )
}

export const addBot = (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  username: string,
  invite?: string | null,
) => {
  const bot = db.select().from(bots).where(eq(bots.username, username)).get()
  if (!bot) throw new DomainError('NOT_FOUND', 'Bot was not found')
  if (!invite)
    return joinBotMembership(db, hub, userId, bot, { canJoin: bot.access === 'public', roles: [] })
  return db.transaction((tx) => {
    const existing = tx
      .select({ revokedAt: chats.revokedAt })
      .from(chats)
      .where(and(eq(chats.userId, userId), eq(chats.botId, bot.id)))
      .get()
    if (existing?.revokedAt) throw new DomainError('FORBIDDEN', 'Bot access was revoked')
    const link = tx
      .select()
      .from(botInvites)
      .where(and(eq(botInvites.botId, bot.id), eq(botInvites.tokenHash, hashToken(invite))))
      .get()
    if (
      !link ||
      link.revokedAt !== null ||
      (link.expiresAt !== null && link.expiresAt <= Date.now())
    ) {
      throw new DomainError('NOT_FOUND', 'Bot or invitation was not found')
    }
    const used = tx
      .select()
      .from(botInviteUses)
      .where(and(eq(botInviteUses.inviteId, link.id), eq(botInviteUses.userId, userId)))
      .get()
    if (!used) {
      if (link.maxUses !== null && link.uses >= link.maxUses)
        throw new DomainError('FORBIDDEN', 'Invitation is exhausted')
      tx.insert(botInviteUses).values({ inviteId: link.id, userId }).run()
      tx.update(botInvites)
        .set({ uses: sql`${botInvites.uses} + 1` })
        .where(eq(botInvites.id, link.id))
        .run()
    }
    return joinBotMembership(tx, hub, userId, bot, { canJoin: true, roles: used ? [] : link.roles })
  })
}

export const joinBotMembership = (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  bot: typeof bots.$inferSelect,
  options: { canJoin: boolean; roles: string[]; guest?: boolean; id?: string },
) => {
  const existing = db
    .select()
    .from(chats)
    .where(and(eq(chats.userId, userId), eq(chats.botId, bot.id)))
    .get()
  if (existing) {
    if (existing.revokedAt !== null) throw new DomainError('FORBIDDEN', 'Bot access was revoked')
    const reopened = existing.hiddenAt !== null
    if (reopened) {
      db.update(chats).set({ hiddenAt: null }).where(eq(chats.id, existing.id)).run()
      existing.hiddenAt = null
    }
    const role =
      !existing.guest && bot.ownerId !== userId
        ? options.roles.find((code) => bot.roles.includes(code))
        : undefined
    const changed = role !== undefined && existing.roles[0] !== role
    if (changed) {
      const roles = [role]
      db.update(chats).set({ roles }).where(eq(chats.id, existing.id)).run()
      existing.roles = roles
      const { user } = getChatForUser(db, existing.id, userId)
      enqueueBotEvent(
        db,
        {
          botId: bot.id,
          chatId: existing.id,
          event: {
            type: 'chat_updated',
            chat: toChatRef(existing, bot),
            user: toUserRef(user),
          },
        },
        hub,
      )
    }
    if (reopened || changed) publishChatCommands(db, hub, existing, bot)
    return toConnectionDto(
      existing,
      bot,
      hub,
      listVisibleCommands(db, bot.id, toChatRef(existing, bot).roles),
    )
  }

  const now = Date.now()
  if (!options.canJoin) throw new DomainError('NOT_FOUND', 'Bot or invitation was not found')
  const chatId = options.id ?? Bun.randomUUIDv7()
  db.insert(chats)
    .values({
      id: chatId,
      userId,
      botId: bot.id,
      roles: options.guest
        ? []
        : [...options.roles, ...bot.defaultRoles, 'user']
            .filter((role) => bot.roles.includes(role))
            .slice(0, 1),
      guest: options.guest ?? false,
      lastReadSeq: 0,
      nextSeq: 1,
      createdAt: now,
    })
    .run()
  const created = getChatForUser(db, chatId, userId)
  const commands = listVisibleCommands(db, bot.id, toChatRef(created.chat, bot).roles)
  if (!created.chat.guest)
    enqueueBotEvent(
      db,
      {
        botId: bot.id,
        chatId,
        event: {
          type: 'chat_started',
          chat: toChatRef(created.chat, bot),
          user: toUserRef(created.user),
        },
      },
      hub,
    )
  if (!created.chat.guest)
    pushUserUpdate(db, hub, userId, {
      type: 'chat.updated',
      chat: toClientChatDto(created.chat, bot, hub, commands),
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
  if (lastReadSeq <= chat.lastReadSeq) return true
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
        chat: toChatRef(updated.chat, updated.bot),
        user: toUserRef(updated.user),
      },
    },
    hub,
  )
  if (updated.chat.hiddenAt === null) {
    pushUserUpdate(db, hub, userId, {
      type: 'chat.updated',
      chat: toClientChatDto(updated.chat, updated.bot, hub),
    })
    if (blocked) createSystemMessage(db, hub, chatId, 'Бот заблокирован')
  }
  return true
}

export const deleteChat = (db: AppDatabase, hub: Hub, userId: string, chatId: string) => {
  const { bot, chat } = getChatForUser(db, chatId, userId)
  if (chat.hiddenAt !== null) return true
  const pending = db.transaction((tx) => {
    const removed = tx
      .delete(botEvents)
      .where(eq(botEvents.chatId, chatId))
      .returning({ seq: botEvents.seq })
      .all()
    tx.delete(messages).where(eq(messages.chatId, chatId)).run()
    tx.delete(chatKv).where(eq(chatKv.chatId, chatId)).run()
    tx.update(files)
      .set({ chatId: null, detachedAt: Date.now() })
      .where(eq(files.chatId, chatId))
      .run()
    tx.delete(userUpdates)
      .where(
        and(
          eq(userUpdates.userId, userId),
          sql`coalesce(
      json_extract(${userUpdates.payload}, '$.chatId'),
      json_extract(${userUpdates.payload}, '$.chat.id'),
      json_extract(${userUpdates.payload}, '$.message.chatId')
    ) = ${chatId}`,
        ),
      )
      .run()
    tx.update(chats)
      .set({ hiddenAt: Date.now(), lastMessageAt: null, lastReadSeq: chat.nextSeq - 1 })
      .where(eq(chats.id, chatId))
      .run()
    return removed
  })
  const inFlight = hub.getBotConnection(bot.id)?.inFlight
  for (const { seq } of pending) inFlight?.delete(seq)
  pushUserUpdate(db, hub, userId, { type: 'chat.removed', chatId })
  flushBotEvents(db, hub, bot.id)
  return true
}

const updateChatNotificationSettings = (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  chatId: string,
  settings: Partial<Pick<typeof chats.$inferSelect, 'notifications' | 'notificationsMutedUntil'>>,
) => {
  const { chat, bot } = getChatForUser(db, chatId, userId)
  db.update(chats).set(settings).where(eq(chats.id, chatId)).run()
  const updated = { ...chat, ...settings }
  if (chat.hiddenAt === null)
    pushUserUpdate(db, hub, userId, {
      type: 'chat.updated',
      chat: toClientChatDto(updated, bot, hub),
    })
  return toConnectionDto(updated, bot, hub)
}

export const setChatNotifications = (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  chatId: string,
  notifications: typeof chats.$inferSelect.notifications,
) => updateChatNotificationSettings(db, hub, userId, chatId, { notifications })

const maximumMuteDuration = 366 * 24 * 60 * 60 * 1000

export const setChatMute = (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  chatId: string,
  mutedUntil: number | null,
) => {
  const now = Date.now()
  if (
    mutedUntil !== null &&
    (!Number.isSafeInteger(mutedUntil) ||
      mutedUntil <= now ||
      mutedUntil > now + maximumMuteDuration)
  ) {
    throw new DomainError('BAD_REQUEST', 'Mute expiry must be in the future and within one year')
  }
  return updateChatNotificationSettings(db, hub, userId, chatId, {
    notificationsMutedUntil: mutedUntil,
  })
}
