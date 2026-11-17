import { BotMethods, KV_QUOTA, type Params } from '@appercot/protocol'
import { and, eq, inArray } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { chatKv } from '../db/schema'
import { getChatForBot } from './chats'
import { DomainError } from './errors'

const encoder = new TextEncoder()
const valueSize = (key: string, value: string) =>
  encoder.encode(key).length + encoder.encode(value).length

export const kvGet = (db: AppDatabase, botId: string, params: Params<'kvGet'>) => {
  getChatForBot(db, params.chatId, botId)
  const rows = params.keys
    ? db
        .select()
        .from(chatKv)
        .where(and(eq(chatKv.chatId, params.chatId), inArray(chatKv.key, params.keys)))
        .all()
    : db.select().from(chatKv).where(eq(chatKv.chatId, params.chatId)).all()
  const values: Record<string, unknown> = {}
  for (const row of rows) values[row.key] = JSON.parse(row.value)
  return BotMethods.kvGet.result.parse(values)
}

export const kvSet = (db: AppDatabase, botId: string, params: Params<'kvSet'>) => {
  getChatForBot(db, params.chatId, botId)
  return db.transaction((transaction) => {
    const current = transaction.select().from(chatKv).where(eq(chatKv.chatId, params.chatId)).all()
    const sizes = new Map(current.map((row) => [row.key, row.size]))
    for (const [key, value] of Object.entries(params.entries)) {
      if (value === null) sizes.delete(key)
      else sizes.set(key, valueSize(key, JSON.stringify(value)))
    }
    const used = [...sizes.values()].reduce((total, size) => total + size, 0)
    if (used > KV_QUOTA) throw new DomainError('KV_QUOTA', 'Chat KV quota exceeded')

    for (const [key, value] of Object.entries(params.entries)) {
      if (value === null) {
        transaction
          .delete(chatKv)
          .where(and(eq(chatKv.chatId, params.chatId), eq(chatKv.key, key)))
          .run()
        continue
      }
      const serialized = JSON.stringify(value)
      transaction
        .insert(chatKv)
        .values({ chatId: params.chatId, key, value: serialized, size: valueSize(key, serialized) })
        .onConflictDoUpdate({
          target: [chatKv.chatId, chatKv.key],
          set: { value: serialized, size: valueSize(key, serialized) },
        })
        .run()
    }
    return { used }
  })
}

export const kvClear = (db: AppDatabase, botId: string, params: Params<'kvClear'>) => {
  getChatForBot(db, params.chatId, botId)
  db.delete(chatKv).where(eq(chatKv.chatId, params.chatId)).run()
  return { ok: true } as const
}
