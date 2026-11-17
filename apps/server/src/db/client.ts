import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite'
import { migrateDatabase } from './migrate'
import * as schema from './schema'

export type AppDatabase = BunSQLiteDatabase<typeof schema>

export interface DatabaseContext {
  db: AppDatabase
  sqlite: Database
}

export const createDatabase = (
  databasePath: string,
  migrationsFolder?: string,
): DatabaseContext => {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(resolve(databasePath)), { recursive: true })
  }
  const sqlite = new Database(databasePath, { create: true })
  sqlite.exec('PRAGMA journal_mode=WAL')
  sqlite.exec('PRAGMA foreign_keys=ON')
  sqlite.exec('PRAGMA busy_timeout=5000')
  sqlite.exec('PRAGMA synchronous=NORMAL')
  const db = drizzle(sqlite, { schema })
  const defaultMigrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))
  migrateDatabase(db, migrationsFolder ?? defaultMigrationsFolder)
  return { db, sqlite }
}
