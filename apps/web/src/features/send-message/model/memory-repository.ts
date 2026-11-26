import {
  type DraftRecord,
  DraftRecordSchema,
  type LocalMessageRepository,
  type OutboxRecord,
  OutboxRecordSchema,
} from './local-records'

const copy = <T>(value: T) => structuredClone(value)

export const createMemoryRepository = (): LocalMessageRepository => {
  const drafts = new Map<string, DraftRecord>()
  const outbox = new Map<string, OutboxRecord>()
  const draftKey = (userId: string, chatId: string) => JSON.stringify([userId, chatId])
  const outboxKey = (userId: string, chatId: string, clientId: string) =>
    JSON.stringify([userId, chatId, clientId])

  return {
    listDrafts: async (userId) => ({
      records: [...drafts.values()].filter((draft) => draft.userId === userId).map(copy),
      corrupted: 0,
    }),
    listOutbox: async (userId) => ({
      records: [...outbox.values()].filter((record) => record.userId === userId).map(copy),
      corrupted: 0,
    }),
    putDraft: async (draft) => {
      const parsed = DraftRecordSchema.parse(draft)
      drafts.set(draftKey(draft.userId, draft.chatId), copy(parsed))
    },
    deleteDraft: async (userId, chatId) => {
      drafts.delete(draftKey(userId, chatId))
    },
    enqueueOutbox: async (record, clearDraft) => {
      const parsed = OutboxRecordSchema.parse(record)
      outbox.set(outboxKey(record.userId, record.chatId, record.clientId), copy(parsed))
      const key = draftKey(record.userId, record.chatId)
      if (clearDraft !== undefined && drafts.get(key)?.text === clearDraft) drafts.delete(key)
    },
    putOutbox: async (record) => {
      const parsed = OutboxRecordSchema.parse(record)
      outbox.set(outboxKey(record.userId, record.chatId, record.clientId), copy(parsed))
    },
    deleteOutbox: async (userId, chatId, clientId) => {
      outbox.delete(outboxKey(userId, chatId, clientId))
    },
    deleteChat: async (userId, chatId) => {
      drafts.delete(draftKey(userId, chatId))
      for (const [key, record] of outbox) {
        if (record.userId === userId && record.chatId === chatId) outbox.delete(key)
      }
    },
    close: () => {},
  }
}
