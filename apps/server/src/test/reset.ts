import { and, eq, inArray, sql } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import {
  botCommands,
  botEvents,
  bots,
  chatKv,
  chats,
  files,
  invites,
  messages,
  pushSubs,
  sessions,
  testSyncResets,
  users,
  userUpdates,
} from '../db/schema'
import type { MediaStorage } from '../domain/media-storage'
import type { Hub } from '../ws/hub'
import { drainFileDeletions, registerFileDeletions } from './deletions'
import { fixtureConflict, fixtureNotFound } from './errors'
import type { TestBaseline } from './seed'

export interface TestResetOptions {
  db: AppDatabase
  hub: Hub
  baseline: TestBaseline
  storage: MediaStorage
}

const deleteUpdatesForChat = (db: AppDatabase, userId: string, chatId: string) => {
  db.delete(userUpdates)
    .where(
      and(
        eq(userUpdates.userId, userId),
        sql`coalesce(
          json_extract(${userUpdates.payload}, '$.chatId'),
          json_extract(${userUpdates.payload}, '$.chat.id'),
          json_extract(${userUpdates.payload}, '$.message.chatId')
        ) = ${chatId}`,
      ),
    )
    .run()
}

const removeFiles = (db: AppDatabase, predicate: (file: typeof files.$inferSelect) => boolean) => {
  const selected = db.select().from(files).all().filter(predicate)
  registerFileDeletions(db, selected)
  if (selected.length)
    db.delete(files)
      .where(
        inArray(
          files.id,
          selected.map(({ id }) => id),
        ),
      )
      .run()
}

const removeChatHistory = (db: AppDatabase, chat: typeof chats.$inferSelect) => {
  db.delete(botEvents).where(eq(botEvents.chatId, chat.id)).run()
  db.delete(messages).where(eq(messages.chatId, chat.id)).run()
  db.delete(chatKv).where(eq(chatKv.chatId, chat.id)).run()
  deleteUpdatesForChat(db, chat.userId, chat.id)
}

const recordSyncReset = (db: AppDatabase, userId: string, chatId: string) => {
  const update = db
    .insert(userUpdates)
    .values({ userId, payload: { type: 'chat.removed', chatId }, createdAt: Date.now() })
    .returning({ seq: userUpdates.seq })
    .get()
  if (!update) throw new Error('Unable to journal test synchronization reset')
  db.insert(testSyncResets)
    .values({ userId, seq: update.seq })
    .onConflictDoUpdate({ target: testSyncResets.userId, set: { seq: update.seq } })
    .run()
}

const clearUser = (db: AppDatabase, userId: string) => {
  const userChats = db.select().from(chats).where(eq(chats.userId, userId)).all()
  const chatIds = new Set(userChats.map(({ id }) => id))
  removeFiles(
    db,
    (file) =>
      (file.ownerType === 'user' && file.ownerId === userId) ||
      (file.chatId !== null && chatIds.has(file.chatId)) ||
      (file.originChatId !== null && chatIds.has(file.originChatId)),
  )
  db.delete(userUpdates).where(eq(userUpdates.userId, userId)).run()
  db.delete(pushSubs).where(eq(pushSubs.userId, userId)).run()
  db.delete(sessions).where(eq(sessions.userId, userId)).run()
  if (userChats.length)
    db.delete(chats)
      .where(
        inArray(
          chats.id,
          userChats.map(({ id }) => id),
        ),
      )
      .run()
  return userChats
}

export const createTestResetService = ({ db, hub, baseline, storage }: TestResetOptions) => {
  const finish = () => drainFileDeletions(db, storage)

  return {
    async flushState() {
      hub.closeAll()
      db.transaction((transaction) => {
        removeFiles(transaction, () => true)
        transaction.delete(userUpdates).run()
        transaction.delete(botEvents).run()
        transaction.delete(chats).run()
        transaction.delete(bots).run()
        transaction.delete(users).run()
        transaction.delete(invites).run()
        transaction.delete(testSyncResets).run()
        const snapshot = baseline.snapshot
        if (snapshot.invites.length) transaction.insert(invites).values(snapshot.invites).run()
        if (snapshot.users.length) transaction.insert(users).values(snapshot.users).run()
        if (snapshot.bots.length) transaction.insert(bots).values(snapshot.bots).run()
        if (snapshot.commands.length)
          transaction.insert(botCommands).values(snapshot.commands).run()
        if (snapshot.chats.length) transaction.insert(chats).values(snapshot.chats).run()
        if (snapshot.messages.length) transaction.insert(messages).values(snapshot.messages).run()
      })
      await finish()
    },

    async flushUser(id: string) {
      hub.closeAll()
      db.transaction((transaction) => {
        const user = transaction.select().from(users).where(eq(users.id, id)).get()
        if (!user) throw fixtureNotFound('User', id)
        const userChats = clearUser(transaction, id)
        recordSyncReset(transaction, id, userChats[0]?.id ?? id)
      })
      await finish()
    },

    async deleteUser(id: string) {
      hub.closeAll()
      db.transaction((transaction) => {
        const user = transaction.select().from(users).where(eq(users.id, id)).get()
        if (!user) throw fixtureNotFound('User', id)
        clearUser(transaction, id)
        transaction.delete(users).where(eq(users.id, id)).run()
      })
      await finish()
    },

    async flushChat(id: string) {
      hub.closeAll()
      db.transaction((transaction) => {
        const current = transaction.select().from(chats).where(eq(chats.id, id)).get()
        if (!current) throw fixtureNotFound('Chat', id)
        const original = baseline.snapshot.chats.find((chat) => chat.id === id)
        if (original) {
          const currentBot = transaction.select().from(bots).where(eq(bots.id, current.botId)).get()
          const originalBot = baseline.snapshot.bots.find((bot) => bot.id === original.botId)
          if (
            current.userId !== original.userId ||
            current.botId !== original.botId ||
            current.guest !== original.guest ||
            current.revokedAt !== null ||
            !currentBot ||
            !originalBot ||
            currentBot.ownerId !== originalBot.ownerId ||
            original.roles.some((role) => !currentBot.roles.includes(role))
          ) {
            throw fixtureConflict(
              'Current bot roles or membership prevent baseline restoration',
              `/chats/${id}`,
            )
          }
        }
        removeFiles(transaction, (file) => file.chatId === id || file.originChatId === id)
        removeChatHistory(transaction, current)
        if (original) {
          transaction.delete(chats).where(eq(chats.id, id)).run()
          transaction.insert(chats).values(original).run()
          const history = baseline.snapshot.messages.filter((message) => message.chatId === id)
          if (history.length) transaction.insert(messages).values(history).run()
        } else {
          transaction
            .update(chats)
            .set({ lastMessageAt: null, lastReadSeq: 0, nextSeq: 1 })
            .where(eq(chats.id, id))
            .run()
        }
        recordSyncReset(transaction, current.userId, id)
      })
      await finish()
    },

    async deleteChat(id: string) {
      hub.closeAll()
      db.transaction((transaction) => {
        const current = transaction.select().from(chats).where(eq(chats.id, id)).get()
        if (!current) throw fixtureNotFound('Chat', id)
        removeFiles(transaction, (file) => file.chatId === id || file.originChatId === id)
        removeChatHistory(transaction, current)
        transaction.delete(chats).where(eq(chats.id, id)).run()
        recordSyncReset(transaction, current.userId, id)
      })
      await finish()
    },
  }
}

export type TestResetService = ReturnType<typeof createTestResetService>
