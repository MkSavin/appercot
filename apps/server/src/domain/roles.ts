import { type Params, RESERVED_BOT_ROLES } from '@appercot/protocol'
import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { botInvites, bots, chats } from '../db/schema'
import type { Hub } from '../ws/hub'
import { getBot, toBotRef } from './bots'
import {
  getChatForBot,
  publishBotChatConfiguration,
  publishChatCommands,
  toChatRef,
  toUserRef,
} from './chats'
import { setBotCommands } from './commands'
import { DomainError } from './errors'
import { enqueueBotEvent } from './events'

const systemRoles = RESERVED_BOT_ROLES

const assertRegisteredRoles = (roles: string[], available: string[]) => {
  if (roles.some((role) => !available.includes(role))) {
    throw new DomainError('BAD_REQUEST', 'Role is not registered for this bot')
  }
}

export const setBotRoles = (
  db: AppDatabase,
  hub: Hub,
  botId: string,
  params: Params<'setRoles'>,
) => {
  const current = getBot(db, botId)
  const definitions = params.roles.map((role) =>
    typeof role === 'string' ? { code: role, name: role } : role,
  )
  const roleLabels = Object.fromEntries(definitions.map(({ code, name }) => [code, name]))
  const roles = Object.keys(roleLabels)
  if (roles.length !== definitions.length)
    throw new DomainError('BAD_REQUEST', 'Duplicate bot role')
  if (roles.some((role) => systemRoles.includes(role))) {
    throw new DomainError('BAD_REQUEST', 'System roles cannot be assigned by a bot')
  }
  const defaultRoles = [
    ...new Set(params.defaultRoles ?? current.defaultRoles.filter((role) => roles.includes(role))),
  ]
  if (defaultRoles.length > 1)
    throw new DomainError('BAD_REQUEST', 'Only one default role is supported')
  assertRegisteredRoles(defaultRoles, roles)
  const access =
    params.access ??
    (params.listed === undefined ? current.access : params.listed ? 'public' : 'by_link')
  db.transaction((tx) => {
    tx.update(bots)
      .set({
        roles,
        roleLabels,
        defaultRoles,
        listed: access === 'public',
        access,
        guestAccess: access === 'public' && current.guestAccess,
      })
      .where(eq(bots.id, botId))
      .run()
    for (const chat of tx.select().from(chats).where(eq(chats.botId, botId)).all()) {
      const assigned = chat.roles.filter((role) => roles.includes(role)).slice(0, 1)
      if (assigned.length !== chat.roles.length) {
        tx.update(chats).set({ roles: assigned }).where(eq(chats.id, chat.id)).run()
      }
    }
    if (params.commands) setBotCommands(tx, botId, { commands: params.commands })
    for (const invite of tx.select().from(botInvites).where(eq(botInvites.botId, botId)).all()) {
      const assigned = invite.roles.filter((role) => roles.includes(role)).slice(0, 1)
      if (assigned.length !== invite.roles.length)
        tx.update(botInvites).set({ roles: assigned }).where(eq(botInvites.id, invite.id)).run()
    }
  })
  publishBotChatConfiguration(db, hub, getBot(db, botId))
  return { ok: true } as const
}

export const setChatRoles = (
  db: AppDatabase,
  hub: Hub,
  botId: string,
  params: Params<'setChatRoles'>,
) => {
  const { chat } = getChatForBot(db, params.chatId, botId)
  const bot = getBot(db, botId)
  const roles = [...new Set(params.roles)]
  if (chat.guest || bot.ownerId === chat.userId || roles.length > 1)
    throw new DomainError('BAD_REQUEST', 'Only one custom role can be assigned to a regular member')
  assertRegisteredRoles(
    roles,
    bot.roles.filter((role) => !systemRoles.includes(role)),
  )
  db.update(chats).set({ roles }).where(eq(chats.id, params.chatId)).run()
  const updated = getChatForBot(db, params.chatId, botId)
  publishChatCommands(db, hub, updated.chat, bot)
  enqueueBotEvent(
    db,
    {
      botId,
      chatId: params.chatId,
      event: {
        type: 'chat_updated',
        chat: toChatRef(updated.chat, bot),
        user: toUserRef(updated.user),
      },
    },
    hub,
  )
  return { ok: true } as const
}

export const getBotRef = (db: AppDatabase, hub: Hub, botId: string) =>
  toBotRef(getBot(db, botId), hub)
