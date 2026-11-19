import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { UserDto } from '../auth/session'
import type { AppDatabase } from '../db/client'
import { botAvatars, bots, chats, messages } from '../db/schema'
import type { Hub } from '../ws/hub'
import { requireManagedBot } from './admin'
import { toBotDto } from './bots'
import { getChatForUser, publishBotChatConfiguration } from './chats'
import { DomainError } from './errors'

export const readAvatar = (value: string) => {
  if (value.length > 720_000) throw new DomainError('BAD_REQUEST', 'Avatar exceeds 512 KiB')
  const parsed = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!parsed) throw new DomainError('BAD_REQUEST', 'Use a PNG, JPEG or WebP image')
  const bytes = Buffer.from(parsed[2] ?? '', 'base64')
  const mime = parsed[1]
  const valid =
    mime === 'image/png'
      ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      : mime === 'image/jpeg'
        ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
        : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (!valid || bytes.length > 512 * 1024)
    throw new DomainError('BAD_REQUEST', 'Invalid avatar image')
  return { bytes, mime: mime ?? 'application/octet-stream' }
}

const ProfileSchema = z.object({
  description: z.string().trim().max(1000),
  welcome: z.string().trim().max(2000),
  avatar: z.string().nullish(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
})

export const updateBotProfile = (
  db: AppDatabase,
  hub: Hub,
  actor: UserDto,
  botId: string,
  input: z.input<typeof ProfileSchema>,
) => {
  const bot = requireManagedBot(db, actor, botId)
  const profile = ProfileSchema.parse(input)
  if (profile.avatar != null) readAvatar(profile.avatar)
  const updated = {
    ...bot,
    description: profile.description,
    welcome: profile.welcome,
    tags: profile.tags ? [...new Set(profile.tags)] : bot.tags,
    avatar:
      profile.avatar === undefined
        ? bot.avatar
        : profile.avatar === null
          ? null
          : Bun.hash(profile.avatar).toString(36),
  }
  db.transaction((tx) => {
    if (profile.avatar === null) tx.delete(botAvatars).where(eq(botAvatars.botId, botId)).run()
    else if (profile.avatar)
      tx.insert(botAvatars)
        .values({ botId, image: profile.avatar })
        .onConflictDoUpdate({ target: botAvatars.botId, set: { image: profile.avatar } })
        .run()
    tx.update(bots)
      .set({
        description: updated.description,
        welcome: updated.welcome,
        tags: updated.tags,
        avatar: updated.avatar,
      })
      .where(eq(bots.id, botId))
      .run()
  })
  publishBotChatConfiguration(db, hub, updated)
  return toBotDto(updated, hub)
}

export const getAvatarForUser = (db: AppDatabase, user: UserDto | null, id: string) => {
  const bot = db.select().from(bots).where(eq(bots.id, id)).get()
  if (!bot?.avatar) return
  const read = () => {
    const avatar = db
      .select({ image: botAvatars.image })
      .from(botAvatars)
      .where(eq(botAvatars.botId, id))
      .get()
    return avatar ? readAvatar(avatar.image) : undefined
  }
  if (!user) return bot.access === 'public' && bot.guestAccess ? read() : undefined
  if (
    bot.access === 'public' ||
    user.role === 'owner' ||
    (user.role === 'admin' && bot.ownerId === user.id)
  ) {
    return read()
  }
  const member = db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.userId, user.id), eq(chats.botId, id), isNull(chats.revokedAt)))
    .get()
  if (member) return read()
}

const mediaPageSize = 30

export const getChatProfile = (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  chatId: string,
  beforeMediaSeq?: number | null,
) => {
  const { chat, bot } = getChatForUser(db, chatId, userId)
  const rows = db
    .select({ content: messages.content, seq: messages.seq })
    .from(messages)
    .where(
      and(
        eq(messages.chatId, chatId),
        isNull(messages.deletedAt),
        sql`json_array_length(json_extract(${messages.content}, '$.media')) > 0`,
        beforeMediaSeq == null ? undefined : lt(messages.seq, beforeMediaSeq),
      ),
    )
    .orderBy(desc(messages.seq))
    .limit(mediaPageSize + 1)
    .all()
  const seen = new Set<string>()
  const page = rows.slice(0, mediaPageSize)
  const media = page
    .flatMap(({ content }) => content.media ?? [])
    .filter(({ fileId }) => {
      if (seen.has(fileId)) return false
      seen.add(fileId)
      return true
    })
  return {
    bot: toBotDto(bot, hub),
    blocked: chat.blockedAt !== null,
    notifications: chat.notifications,
    media,
    olderMediaBefore: rows.length > mediaPageSize ? (page.at(-1)?.seq ?? null) : null,
  }
}
