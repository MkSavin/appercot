import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import type { AppDatabase } from './client'

export const migrateDatabase = (db: AppDatabase, migrationsFolder: string) => {
  migrate(db, { migrationsFolder })
}
