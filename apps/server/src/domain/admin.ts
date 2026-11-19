import {
  BOT_SYSTEM_ROLES,
  type BotAccess,
  type PlatformRole,
  RESERVED_BOT_ROLES,
} from '@appercot/protocol'
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { createBotToken } from '../auth/bot-token'
import { toUserDto, type UserDto } from '../auth/session'
import { createRandomToken, hashToken } from '../auth/tokens'
import type { AppDatabase } from '../db/client'
import { botEvents, botInvites, bots, chats, invites, users } from '../db/schema'
import type { AppEnv } from '../env'
import type { Hub } from '../ws/hub'
import { getBot, toBotDto } from './bots'
import {
  joinBotMembership,
  publishBotChatConfiguration,
  publishChatCommands,
  toChatRef,
  toUserRef,
} from './chats'
import { DomainError } from './errors'
import { enqueueBotEvent } from './events'
import { setChatRoles } from './roles'
import { publishBotPresence, pushUserUpdate } from './updates'

const CreateInviteSchema = z.strictObject({
  maxUses: z.number().int().positive().nullish(),
  expiresInDays: z.number().int().positive().max(3650).nullish(),
  role: z.enum(['user', 'admin']).nullish(),
})

const CreateBotSchema = z.strictObject({
  username: z.string().regex(/^[a-z][a-z0-9_]{2,31}bot$/),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000),
})

export const listAdminUsers = (db: AppDatabase, query?: string | null) => {
  const normalizedQuery = query?.trim().toLowerCase()
  return db
    .select()
    .from(users)
    .where(isNull(users.guestUntil))
    .all()
    .filter(
      (user) =>
        !normalizedQuery ||
        user.username.toLowerCase().includes(normalizedQuery) ||
        user.displayName.toLowerCase().includes(normalizedQuery),
    )
    .map(toUserDto)
}

export const listAdminInvites = (db: AppDatabase, publicUrl: string) =>
  db
    .select()
    .from(invites)
    .orderBy(desc(invites.createdAt))
    .all()
    .map((invite) => ({ ...invite, url: createInviteUrl(publicUrl, invite.code) }))

const createInviteUrl = (publicUrl: string, code: string) => {
  const url = new URL('/register', publicUrl)
  url.searchParams.set('invite', code)
  return url.toString()
}

export const createAdminInvite = (
  db: AppDatabase,
  env: AppEnv,
  adminId: string,
  input: z.input<typeof CreateInviteSchema>,
) => {
  if (!env.ALLOW_USER_INVITES)
    throw new DomainError('FORBIDDEN', 'Приглашения новых пользователей отключены')
  const values = CreateInviteSchema.parse(input)
  const createdAt = Date.now()
  const invite = {
    code: createRandomToken(),
    createdBy: adminId,
    maxUses: values.maxUses ?? null,
    uses: 0,
    role: values.role ?? ('user' as const),
    revokedAt: null,
    expiresAt: values.expiresInDays ? createdAt + values.expiresInDays * 24 * 60 * 60 * 1000 : null,
    createdAt,
  }
  db.insert(invites).values(invite).run()
  return { ...invite, url: createInviteUrl(env.PUBLIC_URL, invite.code) }
}

export const updateAdminInvite = (
  db: AppDatabase,
  publicUrl: string,
  code: string,
  input: z.input<typeof CreateInviteSchema>,
) => {
  const invite = db.select().from(invites).where(eq(invites.code, code)).get()
  if (!invite || invite.revokedAt !== null)
    throw new DomainError('NOT_FOUND', 'Active invitation was not found')
  const values = CreateInviteSchema.parse(input)
  if (values.maxUses != null && values.maxUses < invite.uses)
    throw new DomainError('BAD_REQUEST', 'Limit is below the number of registrations')
  const change = {
    maxUses: values.maxUses === undefined ? invite.maxUses : values.maxUses,
    role: values.role ?? invite.role,
    expiresAt:
      values.expiresInDays === undefined
        ? invite.expiresAt
        : values.expiresInDays
          ? Date.now() + values.expiresInDays * 86_400_000
          : null,
  }
  db.update(invites).set(change).where(eq(invites.code, code)).run()
  return { ...invite, ...change, url: createInviteUrl(publicUrl, code) }
}

export const revokeAdminInvite = (db: AppDatabase, code: string) =>
  Boolean(
    db
      .update(invites)
      .set({ revokedAt: Date.now() })
      .where(and(eq(invites.code, code), isNull(invites.revokedAt)))
      .returning({ code: invites.code })
      .get(),
  )

export const requireManagedBot = (db: AppDatabase, actor: UserDto, botId: string) => {
  const bot = getBot(db, botId)
  if (actor.role !== 'owner' && (actor.role !== 'admin' || bot.ownerId !== actor.id)) {
    throw new DomainError('FORBIDDEN', 'Bot management is limited to its owner')
  }
  return bot
}

export const listAdminBots = (db: AppDatabase, hub: Hub, actor: UserDto) =>
  db
    .select({ bot: bots, memberCount: count(chats.id) })
    .from(bots)
    .leftJoin(chats, and(eq(chats.botId, bots.id), isNull(chats.revokedAt), eq(chats.guest, false)))
    .where(actor.role === 'owner' ? undefined : eq(bots.ownerId, actor.id))
    .groupBy(bots.id)
    .all()
    .map(({ bot, memberCount }) => ({ ...toBotDto(bot, hub), memberCount }))

export const getAdminBot = (db: AppDatabase, hub: Hub, actor: UserDto, botId: string) => {
  const bot = requireManagedBot(db, actor, botId)
  const memberCount =
    db
      .select({ value: count() })
      .from(chats)
      .where(and(eq(chats.botId, botId), isNull(chats.revokedAt), eq(chats.guest, false)))
      .get()?.value ?? 0
  return { ...toBotDto(bot, hub), memberCount }
}

export const createAdminBot = (
  db: AppDatabase,
  hub: Hub,
  actor: UserDto,
  input: z.input<typeof CreateBotSchema>,
) => {
  const values = CreateBotSchema.parse(input)
  const botId = Bun.randomUUIDv7()
  const token = createBotToken(botId)
  const bot = {
    id: botId,
    ...values,
    ownerId: actor.id,
    tokenHash: token.hash,
    createdAt: Date.now(),
  }
  db.insert(bots).values(bot).run()
  return { bot: toBotDto(getBot(db, botId), hub), token: token.token }
}

const disconnectBotCredential = (db: AppDatabase, hub: Hub, botId: string) => {
  const connection = hub.getBotConnection(botId)
  if (connection && hub.disconnectBot(botId, connection.socket)) {
    connection.socket.close(4401, 'token rotated')
    publishBotPresence(db, hub, botId, false)
  }
}

export const resetAdminBotToken = (db: AppDatabase, hub: Hub, actor: UserDto, botId: string) => {
  requireManagedBot(db, actor, botId)
  const token = createBotToken(botId)
  db.update(bots).set({ tokenHash: token.hash }).where(eq(bots.id, botId)).run()
  disconnectBotCredential(db, hub, botId)
  return { bot: toBotDto(getBot(db, botId), hub), token: token.token }
}

export const setAdminBotOwner = (
  db: AppDatabase,
  hub: Hub,
  botId: string,
  username?: string | null,
) => {
  const bot = getBot(db, botId)
  const owner = username
    ? db
        .select()
        .from(users)
        .where(and(eq(users.username, username), isNull(users.guestUntil)))
        .get()
    : null
  if (username && !owner) throw new DomainError('NOT_FOUND', 'User was not found')
  const ownerId = owner?.id ?? null
  if (ownerId === bot.ownerId) return true
  db.update(bots)
    .set({
      ownerId,
      tokenHash: createBotToken(botId).hash,
      inviteHash: null,
      inviteExpiresAt: null,
      inviteRoles: [],
    })
    .where(eq(bots.id, botId))
    .run()
  db.update(botInvites)
    .set({ revokedAt: Date.now() })
    .where(and(eq(botInvites.botId, botId), isNull(botInvites.revokedAt)))
    .run()
  disconnectBotCredential(db, hub, botId)
  publishBotChatConfiguration(db, hub, getBot(db, botId))
  return true
}

export const setAdminBotListed = (
  db: AppDatabase,
  actor: UserDto,
  botId: string,
  listed: boolean,
) => {
  const bot = requireManagedBot(db, actor, botId)
  db.update(bots)
    .set({ listed, access: listed ? 'public' : 'by_link', guestAccess: listed && bot.guestAccess })
    .where(eq(bots.id, botId))
    .run()
  return true
}

export const setPlatformRole = (db: AppDatabase, hub: Hub, userId: string, role: PlatformRole) => {
  const user = db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.guestUntil)))
    .get()
  if (!user) throw new DomainError('NOT_FOUND', 'User was not found')
  if (user.role === 'owner' || role === 'owner') {
    throw new DomainError('FORBIDDEN', 'The platform owner role is fixed')
  }
  db.update(users)
    .set({ role, isAdmin: role === 'admin' })
    .where(eq(users.id, userId))
    .run()
  pushUserUpdate(db, hub, userId, { type: 'platform.role', role })
  return toUserDto({ ...user, role })
}

export const setAdminBotAccess = (
  db: AppDatabase,
  hub: Hub,
  actor: UserDto,
  botId: string,
  access: BotAccess,
) => {
  const bot = requireManagedBot(db, actor, botId)
  if (bot.access === access) return toBotDto(bot, hub)
  const settings = {
    access,
    listed: access === 'public',
    guestAccess: access === 'public' && bot.guestAccess,
  }
  db.update(bots).set(settings).where(eq(bots.id, botId)).run()
  return toBotDto({ ...bot, ...settings }, hub)
}

export const issueBotInvite = (
  db: AppDatabase,
  publicUrl: string,
  actor: UserDto,
  botId: string,
  roles: string[],
  maxUses?: number | null,
  expiresInDays?: number | null,
) => {
  const bot = requireManagedBot(db, actor, botId)
  const inviteRoles = validateInviteRoles(bot, roles)
  const limits = CreateInviteSchema.parse({ maxUses, expiresInDays })
  const token = createRandomToken()
  const now = Date.now()
  const invite = {
    id: Bun.randomUUIDv7(),
    botId,
    code: token,
    tokenHash: hashToken(token),
    roles: inviteRoles,
    maxUses: limits.maxUses ?? null,
    uses: 0,
    createdAt: now,
    revokedAt: null,
    expiresAt: expiresInDays === null ? null : now + (limits.expiresInDays ?? 7) * 86_400_000,
  }
  db.insert(botInvites).values(invite).run()
  return toBotInviteDto(invite, bot.username, publicUrl)
}

const toBotInviteDto = (
  invite: typeof botInvites.$inferSelect,
  username: string,
  publicUrl: string,
) => {
  const url = new URL('/browse', publicUrl)
  url.searchParams.set('bot', username)
  if (invite.code) url.searchParams.set('invite', invite.code)
  return { ...invite, url: invite.code ? url.toString() : null }
}

export const listBotInvites = (
  db: AppDatabase,
  actor: UserDto,
  botId: string,
  publicUrl: string,
) => {
  const bot = requireManagedBot(db, actor, botId)
  return db
    .select()
    .from(botInvites)
    .where(eq(botInvites.botId, botId))
    .orderBy(desc(botInvites.createdAt))
    .all()
    .map((invite) => toBotInviteDto(invite, bot.username, publicUrl))
}

export const updateBotInvite = (
  db: AppDatabase,
  actor: UserDto,
  botId: string,
  id: string,
  publicUrl: string,
  input: { roles: string[]; maxUses?: number | null; expiresInDays?: number | null },
) => {
  const bot = requireManagedBot(db, actor, botId)
  const invite = db
    .select()
    .from(botInvites)
    .where(and(eq(botInvites.id, id), eq(botInvites.botId, botId)))
    .get()
  if (!invite || invite.revokedAt !== null)
    throw new DomainError('NOT_FOUND', 'Active invitation was not found')
  const { maxUses, expiresInDays } = CreateInviteSchema.parse({
    maxUses: input.maxUses,
    expiresInDays: input.expiresInDays,
  })
  if (maxUses != null && maxUses < invite.uses)
    throw new DomainError('BAD_REQUEST', 'Limit is below the number of participants')
  const change = {
    maxUses: maxUses === undefined ? invite.maxUses : maxUses,
    roles: validateInviteRoles(bot, input.roles),
    expiresAt:
      expiresInDays === undefined
        ? invite.expiresAt
        : expiresInDays
          ? Date.now() + expiresInDays * 86_400_000
          : null,
  }
  db.update(botInvites).set(change).where(eq(botInvites.id, id)).run()
  return toBotInviteDto({ ...invite, ...change }, bot.username, publicUrl)
}

const validateInviteRoles = (bot: typeof bots.$inferSelect, roles: string[]) => {
  if (
    roles.length > 1 ||
    roles.some((role) => RESERVED_BOT_ROLES.includes(role) || !bot.roles.includes(role))
  ) {
    throw new DomainError('BAD_REQUEST', 'Role is not registered for this bot')
  }
  return [...new Set(roles)]
}

export const inviteBotMember = (
  db: AppDatabase,
  hub: Hub,
  actor: UserDto,
  botId: string,
  username: string,
  roles: string[],
) => {
  const bot = requireManagedBot(db, actor, botId)
  const assigned = validateInviteRoles(bot, roles)
  const user = db.select({ id: users.id }).from(users).where(eq(users.username, username)).get()
  if (!user) throw new DomainError('NOT_FOUND', 'User was not found')
  joinBotMembership(db, hub, user.id, bot, { canJoin: true, roles: assigned })
  return true
}

export const revokeBotInvite = (
  db: AppDatabase,
  actor: UserDto,
  botId: string,
  id?: string | null,
) => {
  requireManagedBot(db, actor, botId)
  db.update(botInvites)
    .set({ revokedAt: Date.now() })
    .where(
      and(
        eq(botInvites.botId, botId),
        isNull(botInvites.revokedAt),
        id ? eq(botInvites.id, id) : undefined,
      ),
    )
    .run()
  return true
}

export const getBotMemberships = (db: AppDatabase, actor: UserDto, botId: string) => {
  const bot = requireManagedBot(db, actor, botId)
  const reserved: readonly string[] = BOT_SYSTEM_ROLES
  const roles = bot.roles.filter((role) => !RESERVED_BOT_ROLES.includes(role))
  const members = db
    .select({ chat: chats, user: users })
    .from(chats)
    .innerJoin(users, eq(users.id, chats.userId))
    .where(and(eq(chats.botId, botId), eq(chats.guest, false)))
    .orderBy(asc(users.username))
    .all()
    .map(({ chat, user }) => ({
      chatId: chat.id,
      username: user.username,
      displayName: user.displayName,
      revoked: chat.revokedAt !== null,
      roles: toChatRef(chat, bot).roles,
    }))
  return {
    roles,
    roleDefinitions: [
      ...reserved.map((code) => ({
        code,
        name: code === 'guest' ? 'Гость' : 'Владелец бота',
        virtual: true,
      })),
      ...roles.map((code) => ({ code, name: bot.roleLabels[code] ?? code, virtual: false })),
    ],
    members,
  }
}

export const changeBotMemberRoles = (
  db: AppDatabase,
  hub: Hub,
  actor: UserDto,
  botId: string,
  chatId: string,
  roles: string[],
) => {
  requireManagedBot(db, actor, botId)
  return setChatRoles(db, hub, botId, { chatId, roles }).ok
}

export const setBotMemberRevoked = (
  db: AppDatabase,
  hub: Hub,
  actor: UserDto,
  botId: string,
  chatId: string,
  revoked: boolean,
) => {
  const bot = requireManagedBot(db, actor, botId)
  const membership = db
    .select({ chat: chats, user: users })
    .from(chats)
    .innerJoin(users, eq(users.id, chats.userId))
    .where(and(eq(chats.id, chatId), eq(chats.botId, botId)))
    .get()
  if (!membership) throw new DomainError('NOT_FOUND', 'Bot membership was not found')
  const { chat, user } = membership
  if ((chat.revokedAt !== null) === revoked) return true
  const revokedAt = revoked ? Date.now() : null
  const discarded = db.transaction((tx) => {
    tx.update(chats).set({ revokedAt }).where(eq(chats.id, chatId)).run()
    return revoked
      ? tx
          .delete(botEvents)
          .where(eq(botEvents.chatId, chatId))
          .returning({ seq: botEvents.seq })
          .all()
      : []
  })
  const connection = hub.getBotConnection(botId)
  for (const { seq } of discarded) connection?.inFlight.delete(seq)
  const updated = { ...chat, revokedAt }
  if (revoked) pushUserUpdate(db, hub, chat.userId, { type: 'chat.removed', chatId })
  else publishChatCommands(db, hub, updated, bot)
  enqueueBotEvent(
    db,
    {
      botId,
      chatId,
      event: { type: 'chat_updated', chat: toChatRef(updated, bot), user: toUserRef(user) },
    },
    hub,
  )
  return true
}
