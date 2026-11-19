import { type ClientUpdate, ClientUpdateSchema } from '@appercot/protocol'
import { and, eq, isNull } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { chats, userUpdates } from '../db/schema'
import type { Hub } from '../ws/hub'

export const pushUserUpdate = (db: AppDatabase, hub: Hub, userId: string, update: ClientUpdate) => {
  const payload = ClientUpdateSchema.parse(update)
  const inserted = db
    .insert(userUpdates)
    .values({ userId, payload, createdAt: Date.now() })
    .returning({ seq: userUpdates.seq })
    .get()
  if (!inserted) return null
  hub.sendToUser(userId, { t: 'upd', seq: inserted.seq, update: payload })
  return inserted.seq
}

export const publishBotPresence = (db: AppDatabase, hub: Hub, botId: string, online: boolean) => {
  const recipients = db
    .select({ userId: chats.userId })
    .from(chats)
    .where(and(eq(chats.botId, botId), isNull(chats.revokedAt)))
    .all()
  for (const recipient of recipients) {
    pushUserUpdate(db, hub, recipient.userId, { type: 'bot.presence', botId, online })
  }
}
