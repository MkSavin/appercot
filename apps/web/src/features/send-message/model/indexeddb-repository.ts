import {
  DraftRecordSchema,
  type LocalMessageRepository,
  type LocalRecordBatch,
  type LocalRecordSchema,
  LocalStorageUnavailableError,
  OutboxRecordSchema,
} from './local-records'

const databaseName = 'appercot-client'
const databaseVersion = 1

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })

const parseBatch = <T>(rows: unknown[], schema: LocalRecordSchema<T>): LocalRecordBatch<T> => {
  const records: T[] = []
  let corrupted = 0
  for (const row of rows) {
    const parsed = schema.safeParse(row)
    if (parsed.success) records.push(parsed.data)
    else corrupted += 1
  }
  return { records, corrupted }
}

export const createIndexedDbRepository = (
  options: { indexedDB?: IDBFactory; onBlocked?: () => void } = {},
): LocalMessageRepository => {
  let database: IDBDatabase | undefined

  const open = async () => {
    if (database) return database
    const factory = options.indexedDB ?? globalThis.indexedDB
    if (!factory) throw new LocalStorageUnavailableError()
    try {
      const request = factory.open(databaseName, databaseVersion)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('drafts')) {
          const drafts = db.createObjectStore('drafts', { keyPath: ['userId', 'chatId'] })
          drafts.createIndex('by-user', 'userId')
          drafts.createIndex('by-chat', ['userId', 'chatId'])
        }
        if (!db.objectStoreNames.contains('outbox')) {
          const outbox = db.createObjectStore('outbox', {
            keyPath: ['userId', 'chatId', 'clientId'],
          })
          outbox.createIndex('by-user', 'userId')
          outbox.createIndex('by-chat', ['userId', 'chatId'])
        }
      }
      request.onblocked = () => options.onBlocked?.()
      const db = await requestResult(request)
      db.onversionchange = () => {
        db.close()
        if (database === db) database = undefined
      }
      database = db
      return db
    } catch (error) {
      throw new LocalStorageUnavailableError(error)
    }
  }

  const run = async <T>(operation: (db: IDBDatabase) => Promise<T>) => {
    try {
      return await operation(await open())
    } catch (error) {
      if (error instanceof LocalStorageUnavailableError) throw error
      throw new LocalStorageUnavailableError(error)
    }
  }

  const list = async <T>(
    storeName: 'drafts' | 'outbox',
    userId: string,
    schema: LocalRecordSchema<T>,
  ) =>
    run(async (db) => {
      const transaction = db.transaction(storeName, 'readonly')
      const rows = await requestResult(
        transaction.objectStore(storeName).index('by-user').getAll(IDBKeyRange.only(userId)),
      )
      return parseBatch(rows, schema)
    })

  return {
    listDrafts: (userId) => list('drafts', userId, DraftRecordSchema),
    listOutbox: (userId) => list('outbox', userId, OutboxRecordSchema),
    putDraft: (draft) =>
      run(async (db) => {
        const transaction = db.transaction('drafts', 'readwrite')
        transaction.objectStore('drafts').put(DraftRecordSchema.parse(draft))
        await transactionDone(transaction)
      }),
    deleteDraft: (userId, chatId) =>
      run(async (db) => {
        const transaction = db.transaction('drafts', 'readwrite')
        transaction.objectStore('drafts').delete([userId, chatId])
        await transactionDone(transaction)
      }),
    enqueueOutbox: (record, clearDraft) =>
      run(async (db) => {
        const parsed = OutboxRecordSchema.parse(record)
        const transaction = db.transaction(['outbox', 'drafts'], 'readwrite')
        transaction.objectStore('outbox').put(parsed)
        if (clearDraft !== undefined) {
          const drafts = transaction.objectStore('drafts')
          const current = await requestResult(drafts.get([record.userId, record.chatId]))
          const draft = DraftRecordSchema.safeParse(current)
          if (draft.success && draft.data.text === clearDraft)
            drafts.delete([record.userId, record.chatId])
        }
        await transactionDone(transaction)
      }),
    putOutbox: (record) =>
      run(async (db) => {
        const transaction = db.transaction('outbox', 'readwrite')
        transaction.objectStore('outbox').put(OutboxRecordSchema.parse(record))
        await transactionDone(transaction)
      }),
    deleteOutbox: (userId, chatId, clientId) =>
      run(async (db) => {
        const transaction = db.transaction('outbox', 'readwrite')
        transaction.objectStore('outbox').delete([userId, chatId, clientId])
        await transactionDone(transaction)
      }),
    deleteChat: (userId, chatId) =>
      run(async (db) => {
        const transaction = db.transaction(['outbox', 'drafts'], 'readwrite')
        for (const storeName of ['outbox', 'drafts'] as const) {
          const store = transaction.objectStore(storeName)
          const keys = await requestResult(
            store.index('by-chat').getAllKeys(IDBKeyRange.only([userId, chatId])),
          )
          for (const key of keys) store.delete(key)
        }
        await transactionDone(transaction)
      }),
    close: () => {
      database?.close()
      database = undefined
    },
  }
}
