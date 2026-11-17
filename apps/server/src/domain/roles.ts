import type { Params } from '@appercot/protocol'
import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { bots, chats } from '../db/schema'
import type { Hub } from '../ws/hub'
import { getBot, toBotRef } from './bots'
import { getChatForBot, toChatRef, toUserRef } from './chats'
import { enqueueBotEvent } from './events'

export const setBotRoles = (db: AppDatabase, botId: string, params: Params<'setRoles'>) => {
  getBot(db, botId)
  db.update(bots)
    .set({
      roles: params.roles,
      defaultRoles: params.defaultRoles,
      listed: params.listed,
      access: params.access,
    })
    .where(eq(bots.id, botId))
    .run()
  return { ok: true } as const
}

export const setChatRoles = (
  db: AppDatabase,
  hub: Hub,
  botId: string,
  params: Params<'setChatRoles'>,
) => {
  getChatForBot(db, params.chatId, botId)
  db.update(chats).set({ roles: params.roles }).where(eq(chats.id, params.chatId)).run()
  const updated = getChatForBot(db, params.chatId, botId)
  enqueueBotEvent(
    db,
    {
      botId,
      chatId: params.chatId,
      event: {
        type: 'chat_updated',
        chat: toChatRef(updated.chat),
        user: toUserRef(updated.user),
      },
    },
    hub,
  )
  return { ok: true } as const
}

export const getBotRef = (db: AppDatabase, hub: Hub, botId: string) =>
  toBotRef(getBot(db, botId), hub)
