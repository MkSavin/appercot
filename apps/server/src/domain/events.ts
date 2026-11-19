import { allowsBotAction, type BotEvent, BotEventSchema } from '@appercot/protocol'
import { and, asc, eq, notInArray } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botCommands, botEvents, bots, chats, messages, users } from '../db/schema'
import type { Hub } from '../ws/hub'
import { toChatRef } from './chats'
import { pushUserUpdate } from './updates'

interface EnqueueEventInput {
  botId: string
  chatId: string
  event: BotEvent
}

export const enqueueBotEvent = (db: AppDatabase, input: EnqueueEventInput, hub?: Hub) => {
  const inserted = db
    .insert(botEvents)
    .values({
      botId: input.botId,
      chatId: input.chatId,
      payload: BotEventSchema.parse(input.event),
      createdAt: Date.now(),
    })
    .returning({ seq: botEvents.seq })
    .get()
  if (hub) flushBotEvents(db, hub, input.botId)
  return inserted?.seq ?? null
}

const currentCommand = (
  db: AppDatabase,
  botId: string,
  event: Extract<BotEvent, { type: 'command' }>,
) => {
  const membership = db
    .select({ chat: chats, bot: bots, guestUntil: users.guestUntil })
    .from(chats)
    .innerJoin(bots, eq(bots.id, chats.botId))
    .innerJoin(users, eq(users.id, chats.userId))
    .where(
      and(eq(chats.id, event.chat.id), eq(chats.botId, botId), eq(chats.userId, event.user.id)),
    )
    .get()
  const command = db
    .select()
    .from(botCommands)
    .where(and(eq(botCommands.botId, botId), eq(botCommands.name, event.name)))
    .get()
  if (
    !membership ||
    !command ||
    (membership.chat.guest &&
      (!membership.bot.guestAccess ||
        membership.bot.access !== 'public' ||
        (membership.guestUntil ?? 0) <= Date.now())) ||
    membership.chat.blockedAt !== null ||
    membership.chat.revokedAt !== null
  )
    return
  const roles = toChatRef(membership.chat, membership.bot).roles
  if (allowsBotAction(command.roles, roles)) return { ...event, chat: { ...event.chat, roles } }
}

export const flushBotEvents = (db: AppDatabase, hub: Hub, botId: string) => {
  const connection = hub.getBotConnection(botId)
  if (!connection?.readyForEvents) return
  while (connection.inFlight.size < 100) {
    const available = 100 - connection.inFlight.size
    const inFlight = [...connection.inFlight]
    const pending = db
      .select()
      .from(botEvents)
      .where(
        and(
          eq(botEvents.botId, botId),
          inFlight.length ? notInArray(botEvents.seq, inFlight) : undefined,
        ),
      )
      .orderBy(asc(botEvents.seq))
      .limit(available)
      .all()
    for (const event of pending) {
      const payload =
        event.payload.type === 'command' ? currentCommand(db, botId, event.payload) : event.payload
      if (!payload) {
        removeBotEvent(db, hub, botId, event.seq)
        continue
      }
      connection.socket.send(JSON.stringify({ t: 'evt', seq: event.seq, event: payload }))
      connection.inFlight.add(event.seq)
    }
    if (pending.length < available) break
  }
}

const removeBotEvent = (db: AppDatabase, hub: Hub, botId: string, seq: number) => {
  const event = db
    .select()
    .from(botEvents)
    .where(and(eq(botEvents.botId, botId), eq(botEvents.seq, seq)))
    .get()
  if (event) {
    const userId = db.transaction((transaction) => {
      transaction.delete(botEvents).where(eq(botEvents.seq, seq)).run()
      if (event.payload.type !== 'message' && event.payload.type !== 'command') return null
      transaction
        .update(messages)
        .set({ status: 'processed' })
        .where(and(eq(messages.id, event.payload.message.id), eq(messages.status, 'accepted')))
        .run()
      return transaction
        .select({ userId: chats.userId })
        .from(chats)
        .where(eq(chats.id, event.chatId))
        .get()?.userId
    })
    if (userId && (event.payload.type === 'message' || event.payload.type === 'command')) {
      pushUserUpdate(db, hub, userId, {
        type: 'message.status',
        chatId: event.chatId,
        messageId: event.payload.message.id,
        status: 'processed',
      })
    }
  }
  hub.getBotConnection(botId)?.inFlight.delete(seq)
}

export const acknowledgeBotEvent = (db: AppDatabase, hub: Hub, botId: string, seq: number) => {
  removeBotEvent(db, hub, botId, seq)
  flushBotEvents(db, hub, botId)
}
