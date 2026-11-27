import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { bots } from '../db/schema'
import { createRandomToken, hashToken } from './tokens'

export const createBotToken = (botId: string) => {
  const secret = createRandomToken()
  return { token: `${botId}:${secret}`, hash: hashToken(`${botId}:${secret}`) }
}

export const authenticateBotToken = (db: AppDatabase, token: string) => {
  const separatorIndex = token.indexOf(':')
  if (separatorIndex < 1) return null
  const botId = token.slice(0, separatorIndex)
  const bot = db.select().from(bots).where(eq(bots.id, botId)).get()
  if (!bot || bot.stoppedAt !== null || bot.tokenHash !== hashToken(token)) return null
  return bot
}
