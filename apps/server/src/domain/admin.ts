import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { createBotToken } from '../auth/bot-token'
import { toUserDto } from '../auth/session'
import { createRandomToken } from '../auth/tokens'
import type { AppDatabase } from '../db/client'
import { bots, invites, users } from '../db/schema'
import type { AppEnv } from '../env'
import type { Hub } from '../ws/hub'
import { getBot, toBotDto } from './bots'
import { DomainError } from './errors'

const CreateInviteSchema = z.strictObject({
  maxUses: z.number().int().positive().nullish(),
  expiresInDays: z.number().int().positive().nullish(),
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
    .all()
    .map((invite) => ({
      code: invite.code,
      uses: invite.uses,
      maxUses: invite.maxUses,
      url: createInviteUrl(publicUrl, invite.code),
    }))

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
  const values = CreateInviteSchema.parse(input)
  const createdAt = Date.now()
  const invite = {
    code: createRandomToken(),
    createdBy: adminId,
    maxUses: values.maxUses ?? null,
    uses: 0,
    expiresAt: values.expiresInDays ? createdAt + values.expiresInDays * 24 * 60 * 60 * 1000 : null,
    createdAt,
  }
  db.insert(invites).values(invite).run()
  return { ...invite, url: createInviteUrl(env.PUBLIC_URL, invite.code) }
}

export const listAdminBots = (db: AppDatabase, hub: Hub) =>
  db
    .select()
    .from(bots)
    .all()
    .map((bot) => toBotDto(bot, hub))

export const createAdminBot = (
  db: AppDatabase,
  hub: Hub,
  input: z.input<typeof CreateBotSchema>,
) => {
  const values = CreateBotSchema.parse(input)
  const botId = Bun.randomUUIDv7()
  const token = createBotToken(botId)
  const bot = {
    id: botId,
    ...values,
    tokenHash: token.hash,
    createdAt: Date.now(),
  }
  db.insert(bots).values(bot).run()
  return { bot: toBotDto(getBot(db, botId), hub), token: token.token }
}

export const resetAdminBotToken = (db: AppDatabase, hub: Hub, botId: string) => {
  getBot(db, botId)
  const token = createBotToken(botId)
  db.update(bots).set({ tokenHash: token.hash }).where(eq(bots.id, botId)).run()
  return { bot: toBotDto(getBot(db, botId), hub), token: token.token }
}

export const setAdminBotOwner = (db: AppDatabase, botId: string, username?: string | null) => {
  getBot(db, botId)
  const owner = username ? db.select().from(users).where(eq(users.username, username)).get() : null
  if (username && !owner) throw new DomainError('NOT_FOUND', 'User was not found')
  db.update(bots)
    .set({ ownerId: owner?.id ?? null })
    .where(eq(bots.id, botId))
    .run()
  return true
}

export const setAdminBotListed = (db: AppDatabase, botId: string, listed: boolean) => {
  getBot(db, botId)
  db.update(bots).set({ listed }).where(eq(bots.id, botId)).run()
  return true
}
