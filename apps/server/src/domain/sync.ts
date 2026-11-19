import { and, asc, desc, eq, gt, isNotNull } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { chats, userUpdates } from '../db/schema'

const batchSize = 256
export const latestUserSequence = (db: AppDatabase, userId: string) =>
  db
    .select({ seq: userUpdates.seq })
    .from(userUpdates)
    .where(eq(userUpdates.userId, userId))
    .orderBy(desc(userUpdates.seq))
    .get()?.seq ?? 0

export const syncUserUpdates = (db: AppDatabase, userId: string, since: number) => {
  if (since > 0) {
    const checkpoint = db
      .select({ seq: userUpdates.seq })
      .from(userUpdates)
      .where(and(eq(userUpdates.userId, userId), eq(userUpdates.seq, since)))
      .get()
    if (!checkpoint) return { updates: [], resetRequired: true, checkpoint: 0, hasMore: false }
  }
  const updates = db
    .select({ seq: userUpdates.seq, payload: userUpdates.payload })
    .from(userUpdates)
    .where(and(eq(userUpdates.userId, userId), gt(userUpdates.seq, since)))
    .orderBy(asc(userUpdates.seq))
    .limit(batchSize + 1)
    .all()
  const page = updates.slice(0, batchSize)
  const revoked = new Set(
    db
      .select({ id: chats.id })
      .from(chats)
      .where(and(eq(chats.userId, userId), isNotNull(chats.revokedAt)))
      .all()
      .map(({ id }) => id),
  )
  const visible = page.filter(({ payload }) => {
    if (payload.type === 'chat.removed') return true
    const chatId =
      'chatId' in payload
        ? payload.chatId
        : 'chat' in payload
          ? payload.chat.id
          : 'message' in payload
            ? payload.message.chatId
            : undefined
    return chatId === undefined || !revoked.has(chatId)
  })
  return {
    updates: visible,
    resetRequired: false,
    checkpoint: page.at(-1)?.seq ?? since,
    hasMore: updates.length > batchSize,
  }
}
