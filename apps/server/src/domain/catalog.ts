import { and, eq, isNull } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { bots, chats } from '../db/schema'
import type { Hub } from '../ws/hub'
import { toBotDto } from './bots'
import { toChatRef } from './chats'
import { listVisibleCommands } from './commands'
import { DomainError } from './errors'

export const getCatalogBot = (db: AppDatabase, hub: Hub, userId: string, botId: string) => {
  const bot = db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.access, 'public'), eq(bots.listed, true)))
    .get()
  if (!bot) throw new DomainError('NOT_FOUND', 'Bot was not found')
  const membership = db
    .select()
    .from(chats)
    .where(and(eq(chats.userId, userId), eq(chats.botId, bot.id), isNull(chats.revokedAt)))
    .get()
  const roles = membership
    ? toChatRef(membership, bot).roles
    : bot.ownerId === userId
      ? ['owner']
      : [...bot.defaultRoles, 'user'].filter((role) => bot.roles.includes(role)).slice(0, 1)
  return {
    bot: toBotDto(bot, hub),
    commands: listVisibleCommands(db, bot.id, roles),
  }
}
