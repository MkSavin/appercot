import { type BotEvent, BotEventSchema } from '@appercot/protocol'
import { and, asc, eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botEvents, chats, messages } from '../db/schema'
import type { Hub } from '../ws/hub'
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

export const flushBotEvents = (db: AppDatabase, hub: Hub, botId: string) => {
  const connection = hub.getBotConnection(botId)
  if (!connection) return
  const pending = db
    .select()
    .from(botEvents)
    .where(eq(botEvents.botId, botId))
    .orderBy(asc(botEvents.seq))
    .all()
  for (const event of pending) {
    if (connection.inFlight.size >= 100) break
    if (connection.inFlight.has(event.seq)) continue
    connection.socket.send(JSON.stringify({ t: 'evt', seq: event.seq, event: event.payload }))
    connection.inFlight.add(event.seq)
  }
}

export const acknowledgeBotEvent = (db: AppDatabase, hub: Hub, botId: string, seq: number) => {
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
  flushBotEvents(db, hub, botId)
}
