import {
  type Message,
  type MessageContent,
  MessageSchema,
  type Params,
  UserContentSchema,
} from '@appercot/protocol'
import { and, desc, eq, lt, sql } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botCommands, chats, messages } from '../db/schema'
import type { Hub } from '../ws/hub'
import { getChatForBot, getChatForUser, toChatRef, toClientChatDto, toUserRef } from './chats'
import { DomainError } from './errors'
import { enqueueBotEvent } from './events'
import { RateLimiter } from './rate-limit'
import { createSystemMessage } from './system-messages'
import { pushUserUpdate } from './updates'

const userMessageRateLimiter = new RateLimiter(5, 1000)

export const toMessageDto = (message: typeof messages.$inferSelect): Message =>
  MessageSchema.parse({
    id: message.id,
    chatId: message.chatId,
    seq: message.seq,
    sender: message.sender,
    content: message.content,
    status: message.status,
    replyTo: message.replyTo ?? undefined,
    createdAt: message.createdAt,
    editedAt: message.editedAt ?? undefined,
  })

interface InsertMessageInput {
  chatId: string
  sender: 'user' | 'bot' | 'system'
  content: MessageContent
  status: 'accepted' | 'processed'
  clientId?: string
  replyTo?: string
}

const insertMessage = (db: AppDatabase, input: InsertMessageInput) => {
  const now = Date.now()
  const messageId = Bun.randomUUIDv7()
  return db.transaction((transaction) => {
    const chat = transaction
      .update(chats)
      .set({ nextSeq: sql`${chats.nextSeq} + 1`, lastMessageAt: now })
      .where(eq(chats.id, input.chatId))
      .returning({ nextSeq: chats.nextSeq })
      .get()
    if (!chat) throw new DomainError('NOT_FOUND', 'Chat was not found')
    transaction
      .insert(messages)
      .values({
        id: messageId,
        chatId: input.chatId,
        seq: chat.nextSeq - 1,
        sender: input.sender,
        content: input.content,
        status: input.status,
        clientId: input.clientId ?? null,
        replyTo: input.replyTo ?? null,
        createdAt: now,
      })
      .run()
    return transaction.select().from(messages).where(eq(messages.id, messageId)).get()
  })
}

export const createMessage = (db: AppDatabase, hub: Hub, input: InsertMessageInput) => {
  const inserted = insertMessage(db, input)
  if (!inserted) throw new DomainError('INTERNAL', 'Message was not persisted')
  const message = toMessageDto(inserted)
  const chat = db.select().from(chats).where(eq(chats.id, input.chatId)).get()
  if (chat) {
    pushUserUpdate(db, hub, chat.userId, { type: 'message.new', message })
    if (message.sender === 'bot') hub.notifyBotMessage(chat.userId, input.chatId, message)
    const updated = getChatForUser(db, input.chatId, chat.userId)
    pushUserUpdate(db, hub, chat.userId, {
      type: 'chat.updated',
      chat: toClientChatDto(updated.chat, updated.bot, hub),
    })
  }
  return message
}

export const sendUserMessage = (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  input: { chatId: string; clientId: string; content: unknown },
) => {
  if (!userMessageRateLimiter.allow(userId)) {
    throw new DomainError('RATE_LIMIT', 'Too many messages')
  }
  const current = getChatForUser(db, input.chatId, userId)
  if (current.chat.blockedAt !== null) throw new DomainError('FORBIDDEN', 'Bot is blocked')
  const existing = db
    .select()
    .from(messages)
    .where(and(eq(messages.chatId, input.chatId), eq(messages.clientId, input.clientId)))
    .get()
  if (existing) return toMessageDto(existing)
  const content = UserContentSchema.parse(input.content)
  const message = createMessage(db, hub, {
    chatId: input.chatId,
    sender: 'user',
    content,
    status: 'accepted',
    clientId: input.clientId,
  })
  const commandMatch =
    content.media === undefined ? /^\/([a-z0-9_]{1,32})$/.exec(content.text ?? '') : null
  const commandName = commandMatch?.[1]
  const command = commandName
    ? db
        .select()
        .from(botCommands)
        .where(and(eq(botCommands.botId, current.bot.id), eq(botCommands.name, commandName)))
        .get()
    : null
  const hasRole = command?.roles?.some((role) => current.chat.roles.includes(role)) ?? false
  if (command?.roles && command.roles.length > 0 && !hasRole) {
    db.update(messages).set({ status: 'processed' }).where(eq(messages.id, message.id)).run()
    createSystemMessage(db, hub, input.chatId, 'Недостаточно прав')
    return { ...message, status: 'processed' as const }
  }
  const eventMessage = commandName ? { ...message, status: 'accepted' as const } : message
  enqueueBotEvent(
    db,
    {
      botId: current.bot.id,
      chatId: input.chatId,
      event: commandName
        ? {
            type: 'command',
            chat: toChatRef(current.chat),
            user: toUserRef(current.user),
            message: eventMessage,
            name: commandName,
          }
        : {
            type: 'message',
            chat: toChatRef(current.chat),
            user: toUserRef(current.user),
            message,
          },
    },
    hub,
  )
  return eventMessage
}

export const sendBotMessage = (
  db: AppDatabase,
  hub: Hub,
  botId: string,
  params: Params<'sendMessage'>,
) => {
  const { chat } = getChatForBot(db, params.chatId, botId)
  if (chat.blockedAt !== null) throw new DomainError('BOT_BLOCKED', 'Bot is blocked')
  return createMessage(db, hub, {
    chatId: params.chatId,
    sender: 'bot',
    content: params.content,
    status: 'processed',
    replyTo: params.replyTo,
  })
}

export const editBotMessage = (
  db: AppDatabase,
  hub: Hub,
  botId: string,
  params: Params<'editMessage'>,
) => {
  const { chat } = getChatForBot(db, params.chatId, botId)
  if (chat.blockedAt !== null) throw new DomainError('BOT_BLOCKED', 'Bot is blocked')
  const existing = db.select().from(messages).where(eq(messages.id, params.messageId)).get()
  if (!existing || existing.chatId !== params.chatId || existing.sender !== 'bot') {
    throw new DomainError('NOT_FOUND', 'Bot message was not found')
  }
  db.update(messages)
    .set({ content: params.content, editedAt: Date.now() })
    .where(eq(messages.id, params.messageId))
    .run()
  const updated = db.select().from(messages).where(eq(messages.id, params.messageId)).get()
  if (!updated) throw new DomainError('INTERNAL', 'Message was not updated')
  const message = toMessageDto(updated)
  pushUserUpdate(db, hub, chat.userId, { type: 'message.edited', message })
  return message
}

export const deleteBotMessage = (
  db: AppDatabase,
  hub: Hub,
  botId: string,
  params: Params<'deleteMessage'>,
) => {
  const { chat } = getChatForBot(db, params.chatId, botId)
  const existing = db.select().from(messages).where(eq(messages.id, params.messageId)).get()
  if (!existing || existing.chatId !== params.chatId) {
    throw new DomainError('NOT_FOUND', 'Message was not found')
  }
  db.delete(messages).where(eq(messages.id, params.messageId)).run()
  pushUserUpdate(db, hub, chat.userId, {
    type: 'message.deleted',
    chatId: params.chatId,
    messageId: params.messageId,
  })
  return { ok: true } as const
}

export const listMessages = (
  db: AppDatabase,
  userId: string,
  chatId: string,
  before?: number | null,
  limit = 50,
) => {
  getChatForUser(db, chatId, userId)
  const conditions = [eq(messages.chatId, chatId)]
  if (before !== undefined && before !== null) conditions.push(lt(messages.seq, before))
  const rows = db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.seq))
    .limit(Math.min(Math.max(1, limit), 100))
    .all()
  return rows.reverse().map(toMessageDto)
}
