import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { type files, testFileDeletions } from '../db/schema'
import type { MediaStorage } from '../domain/media-storage'
import { TestFixtureError } from './errors'

export const registerFileDeletions = (
  db: AppDatabase,
  rows: Array<Pick<typeof files.$inferSelect, 'id' | 'storage'>>,
) => {
  if (!rows.length) return
  db.insert(testFileDeletions)
    .values(rows.map((file) => ({ fileId: file.id, storage: file.storage, createdAt: Date.now() })))
    .onConflictDoNothing()
    .run()
}

export const drainFileDeletions = async (db: AppDatabase, storage: MediaStorage) => {
  const pending = db.select().from(testFileDeletions).all()
  const failures: unknown[] = []
  for (const row of pending) {
    try {
      await storage.remove(row.storage, row.fileId)
      await storage.remove(row.storage, row.fileId, true)
      db.delete(testFileDeletions).where(eq(testFileDeletions.fileId, row.fileId)).run()
    } catch (error) {
      failures.push(error)
    }
  }
  if (failures.length) {
    throw new TestFixtureError(
      500,
      'TEST_CLEANUP_INCOMPLETE',
      `${failures.length} physical file deletion${failures.length === 1 ? '' : 's'} could not be completed`,
      undefined,
      { cause: new AggregateError(failures, 'Physical file deletion failed') },
    )
  }
}
