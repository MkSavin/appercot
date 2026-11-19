import { and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botEvents, files, users, userUpdates } from '../db/schema'
import type { MediaStorage } from './media-storage'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const pruneOldRecords = (db: AppDatabase, now = Date.now()) => {
  db.delete(users).where(lt(users.guestUntil, now)).run()
  db.delete(userUpdates)
    .where(lt(userUpdates.createdAt, now - 30 * DAY))
    .run()
  db.delete(botEvents)
    .where(lt(botEvents.createdAt, now - 7 * DAY))
    .run()
}

const pruneMedia = async (db: AppDatabase, storage: MediaStorage, now: number) => {
  const expired = and(
    or(isNull(files.chatId), eq(files.attached, false)),
    lt(sql`coalesce(${files.detachedAt}, ${files.createdAt})`, now - DAY),
  )
  const rows = db.select().from(files).where(expired).limit(500).all()
  for (const file of rows) {
    const claimed = db
      .update(files)
      .set({ chatId: null })
      .where(and(eq(files.id, file.id), expired))
      .returning({ id: files.id })
      .get()
    if (!claimed) continue
    try {
      await storage.remove(file.storage, file.id)
      await storage.remove(file.storage, file.id, true)
      db.delete(files).where(eq(files.id, file.id)).run()
    } catch {
      // Keep the metadata as a deletion record so transient object-store errors are retried.
    }
  }
}

export const startPruneJob = (db: AppDatabase, storage: MediaStorage) => {
  let timer: Timer | undefined
  let running: Promise<void> | undefined
  let paused = false
  const execute = () => {
    if (paused || running) return
    const now = Date.now()
    pruneOldRecords(db, now)
    running = pruneMedia(db, storage, now)
      .catch(() => {})
      .finally(() => {
        running = undefined
      })
  }
  const resume = () => {
    if (timer || paused) return
    paused = false
    timer = setInterval(execute, HOUR)
    timer.unref()
  }
  const pause = async () => {
    paused = true
    if (timer) clearInterval(timer)
    timer = undefined
    await running
  }
  resume()
  return {
    pause,
    resume: () => {
      paused = false
      resume()
    },
    stop: pause,
  }
}
