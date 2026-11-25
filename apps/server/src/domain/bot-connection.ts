import { and, count, eq } from 'drizzle-orm'
import type { UserDto } from '../auth/session'
import type { AppDatabase } from '../db/client'
import { botEvents } from '../db/schema'
import type { Hub } from '../ws/hub'
import { requireManagedBot } from './admin'

export const createBotWebSocketUrl = (publicUrl: string) => {
  const url = new URL('/api/bot/ws', publicUrl)
  if (url.protocol === 'https:') url.protocol = 'wss:'
  else if (url.protocol === 'http:') url.protocol = 'ws:'
  else throw new TypeError('PUBLIC_URL must use HTTP or HTTPS')
  return url.toString()
}

export const getAdminBotDiagnostics = (
  db: AppDatabase,
  hub: Hub,
  actor: UserDto,
  botId: string,
) => {
  requireManagedBot(db, actor, botId)
  const diagnostics = hub.getBotDiagnostics(botId)
  const pendingEvents =
    db
      .select({ value: count() })
      .from(botEvents)
      .where(and(eq(botEvents.botId, botId)))
      .get()?.value ?? 0
  return {
    online: hub.isBotOnline(botId),
    connectedAt: diagnostics?.connectedAt ?? null,
    disconnectedAt: diagnostics?.disconnectedAt ?? null,
    lastActivityAt: diagnostics?.lastActivityAt ?? null,
    lastErrorCode: diagnostics?.lastErrorCode ?? null,
    lastErrorAt: diagnostics?.lastErrorAt ?? null,
    pendingEvents,
  }
}
