import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { chats, users } from '../db/schema'
import { DomainError } from './errors'

export const getChatForBot = (db: AppDatabase, chatId: string, botId: string) => {
  const result = db
    .select({ chat: chats, user: users })
    .from(chats)
    .innerJoin(users, eq(users.id, chats.userId))
    .where(eq(chats.id, chatId))
    .get()
  if (!result || result.chat.botId !== botId) {
    throw new DomainError('NOT_FOUND', 'Chat was not found')
  }
  return result
}

export const toChatRef = (chat: typeof chats.$inferSelect) => ({
  id: chat.id,
  roles: chat.roles,
  blocked: chat.blockedAt !== null,
  createdAt: chat.createdAt,
})

export const toUserRef = (user: typeof users.$inferSelect) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
})
