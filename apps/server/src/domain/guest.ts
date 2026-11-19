import { and, eq, gt } from 'drizzle-orm'
import { createRandomToken, hashToken } from '../auth/tokens'
import type { AppDatabase } from '../db/client'
import { bots, chats, users } from '../db/schema'
import type { AppEnv } from '../env'
import type { Hub } from '../ws/hub'
import { toBotDto } from './bots'
import { joinBotMembership } from './chats'
import { listVisibleCommands } from './commands'
import { DomainError } from './errors'
import { listMessages, sendUserMessage } from './messages'
import { RateLimiter } from './rate-limit'

const lifetime = 3600
const starts = new RateLimiter(90, 60_000)
const getBot = (db: AppDatabase, username: string) => {
  const bot = db
    .select()
    .from(bots)
    .where(and(eq(bots.username, username), eq(bots.access, 'public'), eq(bots.guestAccess, true)))
    .get()
  if (!bot) throw new DomainError('NOT_FOUND', 'Гостевой чат недоступен')
  return bot
}
const getToken = (request: Request) =>
  /(?:^|;\s*)appercot_guest=([a-zA-Z0-9_-]{43})(?:;|$)/.exec(
    request.headers.get('cookie') ?? '',
  )?.[1]
const guestId = (token: string, botId: string) => hashToken(`${token}:${botId}`)
const getMember = (db: AppDatabase, userId: string, botId: string) =>
  db
    .select({ id: chats.id })
    .from(chats)
    .innerJoin(users, eq(users.id, chats.userId))
    .where(
      and(
        eq(chats.userId, userId),
        eq(chats.botId, botId),
        eq(chats.guest, true),
        gt(users.guestUntil, Date.now()),
      ),
    )
    .get()

export const openGuestChat = (
  db: AppDatabase,
  hub: Hub,
  env: AppEnv,
  request: Request,
  peer: string,
  username: string,
  setCookie: (cookie: string) => void,
) => {
  const bot = getBot(db, username)
  const token = getToken(request) ?? createRandomToken()
  const userId = guestId(token, bot.id)
  if (!getMember(db, userId, bot.id)) {
    if (!starts.allow(peer))
      throw new DomainError('RATE_LIMIT', 'Слишком много новых гостевых чатов')
    db.transaction((tx) => {
      tx.delete(users).where(eq(users.id, userId)).run()
      const now = Date.now()
      tx.insert(users)
        .values({
          id: userId,
          username: `guest-${userId}`,
          displayName: 'Гость',
          passwordHash: '',
          guestUntil: now + lifetime * 1000,
          createdAt: now,
        })
        .run()
      joinBotMembership(tx, hub, userId, bot, { canJoin: true, roles: [], guest: true })
    })
  }
  const secure = env.PUBLIC_URL.startsWith('https:') ? '; Secure' : ''
  setCookie(
    `appercot_guest=${token}; Path=/graphql; HttpOnly; SameSite=Lax; Max-Age=${lifetime}${secure}`,
  )
  return true
}

export const viewGuestChat = (db: AppDatabase, hub: Hub, request: Request, username: string) => {
  const bot = getBot(db, username)
  const token = getToken(request)
  const userId = token ? guestId(token, bot.id) : undefined
  const member = userId ? getMember(db, userId, bot.id) : undefined
  const commands = listVisibleCommands(db, bot.id, ['guest'])
  const allowed = new Set(commands.map(({ name }) => `/${name}`))
  return {
    bot: toBotDto(bot, hub),
    commands,
    active: Boolean(member),
    messages:
      member && userId
        ? listMessages(db, userId, member.id).map(({ content, ...message }) => {
            const buttons = content.buttons
              ?.map((row) =>
                row.filter((button) => 'command' in button && allowed.has(button.command)),
              )
              .filter((row) => row.length)
            const text =
              content.text ?? (buttons?.length ? 'Выберите команду' : 'Недоступно в гостевом чате')
            return { ...message, content: { text, ...(buttons?.length ? { buttons } : {}) } }
          })
        : [],
  }
}

export const sendGuestCommand = (
  db: AppDatabase,
  hub: Hub,
  request: Request,
  username: string,
  command: string,
  clientId: string,
) => {
  const bot = getBot(db, username)
  const token = getToken(request)
  if (!token) throw new DomainError('UNAUTHORIZED', 'Откройте гостевой чат')
  const userId = guestId(token, bot.id)
  const member = getMember(db, userId, bot.id)
  if (!member) throw new DomainError('UNAUTHORIZED', 'Гостевая сессия завершилась')
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(clientId))
    throw new DomainError('BAD_REQUEST', 'Некорректный идентификатор команды')
  sendUserMessage(db, hub, userId, { chatId: member.id, clientId, content: { text: command } })
  return true
}
