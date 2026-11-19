import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '../auth/password'
import { toUserDto } from '../auth/session'
import { hashToken } from '../auth/tokens'
import { checkSecondFactor } from '../auth/totp'
import type { AppDatabase } from '../db/client'
import { pushSubs, sessions, users } from '../db/schema'
import type { Hub } from '../ws/hub'
import { DomainError } from './errors'

const ProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,32}$/),
  displayName: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(500),
})
const PasswordSchema = z.string().min(8).max(256)

export const getAccount = (db: AppDatabase, userId: string) => {
  const user = db.select().from(users).where(eq(users.id, userId)).get()
  if (!user || user.guestUntil !== null) throw new DomainError('NOT_FOUND', 'User was not found')
  return user
}

export const verifyAccountPassword = async (db: AppDatabase, userId: string, password: string) => {
  const user = getAccount(db, userId)
  if (password.length > 256 || !(await verifyPassword(password, user.passwordHash))) {
    throw new DomainError('UNAUTHORIZED', 'Incorrect password')
  }
  const current = getAccount(db, userId)
  if (current.passwordHash !== user.passwordHash)
    throw new DomainError('UNAUTHORIZED', 'Incorrect password')
  return current
}

export const updateAccount = (
  db: AppDatabase,
  userId: string,
  input: z.input<typeof ProfileSchema>,
) => {
  const profile = ProfileSchema.parse(input)
  getAccount(db, userId)
  const conflict = db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.username, profile.username), ne(users.id, userId)))
    .get()
  if (conflict) throw new DomainError('BAD_REQUEST', 'Username is already in use')
  const user = db.update(users).set(profile).where(eq(users.id, userId)).returning().get()
  if (!user) throw new DomainError('NOT_FOUND', 'User was not found')
  return toUserDto(user)
}

export const listSessions = (db: AppDatabase, userId: string, currentId: string) =>
  db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, Date.now())))
    .orderBy(desc(sessions.createdAt))
    .all()
    .map((row) => ({
      id: hashToken(row.id),
      userAgent: row.userAgent,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      current: row.id === currentId,
    }))

export const revokeSession = (db: AppDatabase, hub: Hub, userId: string, id: string) => {
  const row = db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .all()
    .find((session) => hashToken(session.id) === id)
  if (!row) return false
  db.transaction((tx) => {
    tx.delete(sessions).where(eq(sessions.id, row.id)).run()
    tx.delete(pushSubs)
      .where(and(eq(pushSubs.userId, userId), isNull(pushSubs.sessionId)))
      .run()
  })
  hub.disconnectSessions(userId, [row.id])
  return true
}

const removeSessions = (db: AppDatabase, userId: string, except?: string) => {
  db.delete(pushSubs)
    .where(and(eq(pushSubs.userId, userId), isNull(pushSubs.sessionId)))
    .run()
  return db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), except ? ne(sessions.id, except) : undefined))
    .returning({ id: sessions.id })
    .all()
    .map(({ id }) => id)
}

export const changeAccountPassword = async (
  db: AppDatabase,
  hub: Hub,
  directory: string,
  userId: string,
  currentId: string,
  input: { password: string; newPassword: string; otp?: string | null },
) => {
  const passwordHash = await hashPassword(PasswordSchema.parse(input.newPassword))
  const account = await verifyAccountPassword(db, userId, input.password)
  const removed = db.transaction((tx) => {
    const current = getAccount(tx, userId)
    if (current.passwordHash !== account.passwordHash)
      throw new DomainError('UNAUTHORIZED', 'Incorrect password')
    checkSecondFactor(tx, directory, current, input.otp)
    tx.update(users).set({ passwordHash }).where(eq(users.id, userId)).run()
    return removeSessions(tx, userId, currentId)
  })
  hub.disconnectSessions(userId, removed)
  return true
}

export const resetAccountPassword = async (
  db: AppDatabase,
  hub: Hub,
  userId: string,
  password: string,
) => {
  if (getAccount(db, userId).role === 'owner')
    throw new DomainError('FORBIDDEN', 'Change the owner password from the profile')
  const passwordHash = await hashPassword(PasswordSchema.parse(password))
  const removed = db.transaction((tx) => {
    const updated = tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId))
      .returning({ id: users.id })
      .get()
    if (!updated) throw new DomainError('NOT_FOUND', 'User was not found')
    return removeSessions(tx, userId)
  })
  hub.disconnectSessions(userId, removed)
  return true
}

export const deleteAccount = async (
  db: AppDatabase,
  hub: Hub,
  directory: string,
  userId: string,
  password: string,
  otp?: string | null,
) => {
  const account = await verifyAccountPassword(db, userId, password)
  if (account.role === 'owner')
    throw new DomainError('FORBIDDEN', 'The owner account cannot be deleted')
  const ids = db.transaction((tx) => {
    const current = getAccount(tx, userId)
    if (current.passwordHash !== account.passwordHash)
      throw new DomainError('UNAUTHORIZED', 'Incorrect password')
    checkSecondFactor(tx, directory, current, otp)
    const ids = tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .all()
    tx.delete(users).where(eq(users.id, userId)).run()
    return ids.map(({ id }) => id)
  })
  hub.disconnectSessions(userId, ids)
  return true
}
