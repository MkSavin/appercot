import type { BotRef } from '@appercot/protocol'
import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { bots } from '../db/schema'
import type { Hub } from '../ws/hub'
import { DomainError } from './errors'

export const getBot = (db: AppDatabase, botId: string) => {
  const bot = db.select().from(bots).where(eq(bots.id, botId)).get()
  if (!bot) throw new DomainError('NOT_FOUND', 'Bot was not found')
  return bot
}

export const toBotRef = (bot: typeof bots.$inferSelect, hub: Hub): BotRef => ({
  id: bot.id,
  username: bot.username,
  name: bot.name,
  description: bot.description,
  online: hub.isBotOnline(bot.id),
})

export const toBotDto = (bot: typeof bots.$inferSelect, hub: Hub) => ({
  ...toBotRef(bot, hub),
  listed: bot.listed,
  guestAccess: bot.guestAccess,
  access: bot.access,
  avatar: bot.avatar ? `/api/bots/${encodeURIComponent(bot.id)}/avatar?v=${bot.avatar}` : null,
  welcome: bot.welcome,
  tags: bot.tags,
})
