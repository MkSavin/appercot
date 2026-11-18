import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { type BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite'
import { resolveRuntimeDirectory } from '../runtime'
import { migrateDatabase } from './migrate'
import * as schema from './schema'

export type AppDatabase = BunSQLiteDatabase<typeof schema>

export interface DatabaseContext {
  db: AppDatabase
  sqlite: Database
}

export const resolveMigrationsFolder = (
  moduleDir = import.meta.dir,
  executablePath = process.execPath,
) => {
  const runtimeDir = resolveRuntimeDirectory(moduleDir, executablePath)
  const bundled = resolve(runtimeDir, 'drizzle')
  return existsSync(bundled) ? bundled : resolve(runtimeDir, '../../drizzle')
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
  migrateDatabase(db, migrationsFolder ?? resolveMigrationsFolder())
  return { db, sqlite }
}
