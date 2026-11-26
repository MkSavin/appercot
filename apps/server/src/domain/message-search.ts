import { and, asc, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { messages } from '../db/schema'
import { getChatForUser } from './chats'
import { DomainError } from './errors'
import { toMessageDto } from './message-dto'

const maximumQueryLength = 200
const maximumTokens = 8

export const tokenizeMessageSearch = (query: string) =>
  query.trim().split(/\s+/u).filter(Boolean).slice(0, maximumTokens)

export const buildMessageSearchMatch = (query: string) => {
  const tokens = tokenizeMessageSearch(query)
  return tokens
    .map((token, index) => {
      const phrase = `"${token.replaceAll('"', '""')}"`
      return index === tokens.length - 1 ? `${phrase}*` : phrase
    })
    .join(' AND ')
}

const cleanSnippet = (snippet: string) =>
  [...snippet]
    .filter((character) => {
      const code = character.charCodeAt(0)
      return (code > 31 && code !== 127) || code === 9 || code === 10 || code === 13
    })
    .join('')

export const searchMessages = (
  db: AppDatabase,
  userId: string,
  chatId: string,
  query: string,
  beforeSeq?: number | null,
  limit = 30,
) => {
  getChatForUser(db, chatId, userId)
  if (query.length > maximumQueryLength) {
    throw new DomainError('BAD_REQUEST', 'Search query is too long')
  }
  const match = buildMessageSearchMatch(query)
  if (!match) return { items: [], hasMore: false }
  const pageSize = Math.min(Math.max(1, limit), 50)
  const conditions = [
    eq(messages.chatId, chatId),
    isNull(messages.deletedAt),
    sql`message_search MATCH ${match}`,
  ]
  if (beforeSeq != null) conditions.push(lt(messages.seq, beforeSeq))
  const rows = db
    .select({
      message: messages,
      snippet: sql<string>`snippet(message_search, 0, '', '', '…', 24)`,
    })
    .from(messages)
    .innerJoin(sql`message_search`, sql`message_search.rowid = messages.rowid`)
    .where(and(...conditions))
    .orderBy(desc(messages.seq))
    .limit(pageSize + 1)
    .all()
  return {
    items: rows.slice(0, pageSize).map((row) => ({
      message: toMessageDto(row.message),
      snippet: cleanSnippet(row.snippet),
    })),
    hasMore: rows.length > pageSize,
  }
}

export const getMessageContext = (
  db: AppDatabase,
  userId: string,
  chatId: string,
  targetSeq: number,
  before = 25,
  after = 25,
) => {
  getChatForUser(db, chatId, userId)
  if (!Number.isSafeInteger(targetSeq) || targetSeq < 1) {
    throw new DomainError('BAD_REQUEST', 'Invalid target sequence')
  }
  const target = db
    .select()
    .from(messages)
    .where(
      and(eq(messages.chatId, chatId), eq(messages.seq, targetSeq), isNull(messages.deletedAt)),
    )
    .get()
  if (!target) throw new DomainError('NOT_FOUND', 'Message was not found')
  const earlierLimit = Math.min(Math.max(0, before), 50)
  const laterLimit = Math.min(Math.max(0, after), 50)
  const earlier = db
    .select()
    .from(messages)
    .where(
      and(eq(messages.chatId, chatId), lt(messages.seq, targetSeq), isNull(messages.deletedAt)),
    )
    .orderBy(desc(messages.seq))
    .limit(earlierLimit + 1)
    .all()
  const later = db
    .select()
    .from(messages)
    .where(
      and(eq(messages.chatId, chatId), gt(messages.seq, targetSeq), isNull(messages.deletedAt)),
    )
    .orderBy(asc(messages.seq))
    .limit(laterLimit + 1)
    .all()
  const latest = db
    .select({ seq: sql<number>`coalesce(max(${messages.seq}), 0)` })
    .from(messages)
    .where(and(eq(messages.chatId, chatId), isNull(messages.deletedAt)))
    .get()
  return {
    messages: [
      ...earlier.slice(0, earlierLimit).reverse(),
      target,
      ...later.slice(0, laterLimit),
    ].map(toMessageDto),
    targetSeq,
    hasEarlier: earlier.length > earlierLimit,
    hasLater: later.length > laterLimit,
    latestSeq: latest?.seq ?? targetSeq,
  }
}
