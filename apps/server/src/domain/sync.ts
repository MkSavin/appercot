import { and, asc, eq, gt } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { userUpdates } from '../db/schema'

export const syncUserUpdates = (db: AppDatabase, userId: string, since: number) => {
  if (since > 0) {
    const checkpoint = db
      .select({ seq: userUpdates.seq })
      .from(userUpdates)
      .where(and(eq(userUpdates.userId, userId), eq(userUpdates.seq, since)))
      .get()
    if (!checkpoint) return { updates: [], resetRequired: true }
  }
  const updates = db
    .select({ seq: userUpdates.seq, payload: userUpdates.payload })
    .from(userUpdates)
    .where(and(eq(userUpdates.userId, userId), gt(userUpdates.seq, since)))
    .orderBy(asc(userUpdates.seq))
    .all()
  return { updates, resetRequired: false }
}
