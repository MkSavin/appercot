import { and, isNull, lt } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botEvents, files, userUpdates } from '../db/schema'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const pruneOldRecords = (db: AppDatabase, now = Date.now()) => {
  db.delete(userUpdates)
    .where(lt(userUpdates.createdAt, now - 30 * DAY))
    .run()
  db.delete(botEvents)
    .where(lt(botEvents.createdAt, now - 7 * DAY))
    .run()
  db.delete(files)
    .where(and(isNull(files.chatId), lt(files.createdAt, now - DAY)))
    .run()
}

export const startPruneJob = (db: AppDatabase) => {
  const timer = setInterval(() => pruneOldRecords(db), HOUR)
  timer.unref()
  return timer
}
