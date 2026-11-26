import { type UserContent, UserContentSchema } from '@appercot/protocol'

export type DraftRecord = {
  userId: string
  chatId: string
  text: string
  updatedAt: number
}

export type OutboxRecord = {
  userId: string
  chatId: string
  clientId: string
  content: UserContent
  createdAt: number
  state: 'queued' | 'sending' | 'failed'
  attempts: number
  nextAttemptAt: number
  lastErrorCode?: string
  updatedAt: number
}

type ParseResult<T> = { success: true; data: T } | { success: false }
export interface LocalRecordSchema<T> {
  parse: (value: unknown) => T
  safeParse: (value: unknown) => ParseResult<T>
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const isTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const hasOnly = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key))

const schema = <T>(parse: (value: unknown) => T): LocalRecordSchema<T> => ({
  parse,
  safeParse: (value) => {
    try {
      return { success: true, data: parse(value) }
    } catch {
      return { success: false }
    }
  },
})

export const DraftRecordSchema = schema<DraftRecord>((value): DraftRecord => {
  if (
    !isObject(value) ||
    !hasOnly(value, ['userId', 'chatId', 'text', 'updatedAt']) ||
    !isId(value.userId) ||
    !isId(value.chatId) ||
    typeof value.text !== 'string' ||
    !isTimestamp(value.updatedAt)
  ) {
    throw new Error('Invalid draft record')
  }
  return {
    userId: value.userId,
    chatId: value.chatId,
    text: value.text,
    updatedAt: value.updatedAt,
  }
})

export const OutboxRecordSchema = schema<OutboxRecord>((value): OutboxRecord => {
  if (
    !isObject(value) ||
    !hasOnly(value, [
      'userId',
      'chatId',
      'clientId',
      'content',
      'createdAt',
      'state',
      'attempts',
      'nextAttemptAt',
      'lastErrorCode',
      'updatedAt',
    ]) ||
    !isId(value.userId) ||
    !isId(value.chatId) ||
    !isId(value.clientId) ||
    !isTimestamp(value.createdAt) ||
    !['queued', 'sending', 'failed'].includes(String(value.state)) ||
    !isTimestamp(value.attempts) ||
    !isTimestamp(value.nextAttemptAt) ||
    (value.lastErrorCode !== undefined && typeof value.lastErrorCode !== 'string') ||
    !isTimestamp(value.updatedAt)
  ) {
    throw new Error('Invalid outbox record')
  }
  const content = UserContentSchema.parse(value.content)
  return {
    userId: value.userId,
    chatId: value.chatId,
    clientId: value.clientId,
    content,
    createdAt: value.createdAt,
    state: value.state as OutboxRecord['state'],
    attempts: value.attempts,
    nextAttemptAt: value.nextAttemptAt,
    ...(value.lastErrorCode !== undefined ? { lastErrorCode: value.lastErrorCode } : {}),
    updatedAt: value.updatedAt,
  }
})

export interface LocalRecordBatch<T> {
  records: T[]
  corrupted: number
}

export interface LocalMessageRepository {
  listDrafts: (userId: string) => Promise<LocalRecordBatch<DraftRecord>>
  listOutbox: (userId: string) => Promise<LocalRecordBatch<OutboxRecord>>
  putDraft: (draft: DraftRecord) => Promise<void>
  deleteDraft: (userId: string, chatId: string) => Promise<void>
  enqueueOutbox: (record: OutboxRecord, clearDraft?: string) => Promise<void>
  putOutbox: (record: OutboxRecord) => Promise<void>
  deleteOutbox: (userId: string, chatId: string, clientId: string) => Promise<void>
  deleteChat: (userId: string, chatId: string) => Promise<void>
  close: () => void
}

export class LocalStorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Local message storage is unavailable', { cause })
    this.name = 'LocalStorageUnavailableError'
  }
}
