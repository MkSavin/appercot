import type { PlatformRole } from '@appercot/protocol'
import { and, count, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import type { AppDatabase } from '../db/client'
import { invites, sessions, users } from '../db/schema'
import { DomainError } from '../domain/errors'
import type { AppEnv } from '../env'
import { hashPassword, verifyPassword } from './password'
import { createRandomToken, hashToken } from './tokens'
import { checkSecondFactor, clearTotp } from './totp'

const SESSION_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000
const SESSION_LIFETIME_SECONDS = SESSION_LIFETIME_MS / 1000

const LoginInputSchema = z.strictObject({
  username: z.string().min(1),
  password: z.string().min(1),
  otp: z.string().max(64).nullish(),
})

const RegistrationInputSchema = z.strictObject({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,32}$/),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
  invite: z.string().min(1),
})

export interface UserDto {
  id: string
  username: string
  displayName: string
  bio: string
  twoFactorEnabled: boolean
  isAdmin: boolean
  role: PlatformRole
}

export interface AuthSession {
  sessionId: string
  token: string
  user: UserDto
  expiresAt: number
}

export const toUserDto = (user: typeof users.$inferSelect): UserDto => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  bio: user.bio,
  twoFactorEnabled: Boolean(user.totpSecret),
  isAdmin: user.role !== 'user',
  role: user.role,
})

const createAuthSession = (
  db: AppDatabase,
  user: typeof users.$inferSelect,
  userAgent?: string | null,
): AuthSession => {
  const token = createRandomToken()
  const sessionId = hashToken(token)
  const createdAt = Date.now()
  const expiresAt = createdAt + SESSION_LIFETIME_MS
  db.insert(sessions)
    .values({
      id: sessionId,
      userId: user.id,
      expiresAt,
      createdAt,
      userAgent: userAgent?.slice(0, 500),
    })
    .run()
  return { sessionId, token, user: toUserDto(user), expiresAt }
}

export const loginUser = async (
  db: AppDatabase,
  input: z.input<typeof LoginInputSchema>,
  directory = '.data',
  userAgent?: string | null,
): Promise<AuthSession> => {
  const credentials = LoginInputSchema.parse(input)
  const user = db
    .select()
    .from(users)
    .where(and(eq(users.username, credentials.username), isNull(users.guestUntil)))
    .get()
  if (!user || !(await verifyPassword(credentials.password, user.passwordHash))) {
    throw new DomainError('UNAUTHORIZED', 'Invalid username or password')
  }
  return db.transaction((tx) => {
    const current = tx.select().from(users).where(eq(users.id, user.id)).get()
    if (!current || current.passwordHash !== user.passwordHash)
      throw new DomainError('UNAUTHORIZED', 'Invalid username or password')
    if (checkSecondFactor(tx, directory, current, credentials.otp) === 'recovery') {
      clearTotp(tx, current.id)
      return createAuthSession(tx, { ...current, totpSecret: null }, userAgent)
    }
    return createAuthSession(tx, current, userAgent)
  })
}

export const registerUser = async (
  db: AppDatabase,
  env: AppEnv,
  input: z.input<typeof RegistrationInputSchema>,
  userAgent?: string | null,
): Promise<AuthSession> => {
  const registration = RegistrationInputSchema.parse(input)
  if (!env.ALLOW_REGISTRATION) throw new DomainError('FORBIDDEN', 'Регистрация отключена')
  const passwordHash = await hashPassword(registration.password)
  const user = db.transaction((transaction) => {
    const invite = transaction
      .select()
      .from(invites)
      .where(eq(invites.code, registration.invite))
      .get()
    const now = Date.now()
    if (
      !invite ||
      invite.revokedAt !== null ||
      (invite.maxUses !== null && invite.uses >= invite.maxUses) ||
      (invite.expiresAt !== null && invite.expiresAt <= now)
    ) {
      throw new DomainError('FORBIDDEN', 'Invite is invalid or exhausted')
    }

    const userCount =
      transaction.select({ value: count() }).from(users).where(isNull(users.guestUntil)).get()
        ?.value ?? 0
    const isOwner = userCount === 0 && env.BOOTSTRAP_INVITE === registration.invite
    const role = isOwner ? 'owner' : invite.role
    const userId = Bun.randomUUIDv7()
    transaction
      .insert(users)
      .values({
        id: userId,
        username: registration.username,
        passwordHash,
        displayName: registration.displayName,
        isAdmin: role !== 'user',
        role,
        createdAt: now,
      })
      .run()
    transaction
      .update(invites)
      .set({ uses: invite.uses + 1 })
      .where(eq(invites.code, invite.code))
      .run()
    return transaction.select().from(users).where(eq(users.id, userId)).get()
  })
  if (!user) throw new DomainError('INTERNAL', 'Registered user was not persisted')
  return createAuthSession(db, user, userAgent)
}

export const getSessionByToken = (
  db: AppDatabase,
  token: string,
  now = Date.now(),
): AuthSession | null => {
  const sessionId = hashToken(token)
  const result = db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .get()
  if (!result) return null
  if (result.session.expiresAt <= now) {
    db.delete(sessions).where(eq(sessions.id, sessionId)).run()
    return null
  }
  return {
    sessionId,
    token,
    user: toUserDto(result.user),
    expiresAt: result.session.expiresAt,
  }
}

export const logoutUser = (db: AppDatabase, token: string) => {
  db.delete(sessions)
    .where(eq(sessions.id, hashToken(token)))
    .run()
}

export const getSessionToken = (request: Request) => {
  const cookies = request.headers.get('cookie') ?? ''
  for (const cookie of cookies.split(';')) {
    const [name, ...value] = cookie.trim().split('=')
    if (name === 'sid' && value.length > 0) return decodeURIComponent(value.join('='))
  }
  return null
}

export const getRequestSession = (db: AppDatabase, request: Request) => {
  const token = getSessionToken(request)
  return token ? getSessionByToken(db, token) : null
}

export const createSessionCookie = (token: string, env: AppEnv) => {
  const secure = env.PUBLIC_URL.startsWith('https:') ? '; Secure' : ''
  return `sid=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_LIFETIME_SECONDS}${secure}`
}

export const createLogoutCookie = (env: AppEnv) => {
  const secure = env.PUBLIC_URL.startsWith('https:') ? '; Secure' : ''
  return `sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}
