import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { and, eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { users } from '../db/schema'
import { DomainError } from '../domain/errors'
import { RateLimiter } from '../domain/rate-limit'
import { hashToken } from './tokens'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const attempts = new RateLimiter(8, 60_000)

const key = (directory: string, create = false) => {
  const path = resolve(directory, 'totp.key')
  if (create) {
    mkdirSync(directory, { recursive: true })
    try {
      writeFileSync(path, randomBytes(32), { flag: 'wx', mode: 0o600 })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
  return readFileSync(path)
}

const encodeBase32 = (bytes: Buffer) => {
  let result = ''
  let value = 0
  let bits = 0
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += alphabet[(value >> bits) & 31]
    }
  }
  if (bits) result += alphabet[(value << (5 - bits)) & 31]
  return result
}

const encrypt = (secret: Buffer, directory: string, userId: string) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(directory, true), iv)
  cipher.setAAD(Buffer.from(userId))
  const ciphertext = Buffer.concat([cipher.update(secret), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url')
}

const decrypt = (value: string, directory: string, userId: string) => {
  const bytes = Buffer.from(value, 'base64url')
  const cipher = createDecipheriv('aes-256-gcm', key(directory), bytes.subarray(0, 12))
  cipher.setAAD(Buffer.from(userId))
  cipher.setAuthTag(bytes.subarray(12, 28))
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()])
}

export const totpCode = (secret: Buffer, counter: number) => {
  const step = Buffer.alloc(8)
  step.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', secret).update(step).digest()
  const offset = digest.readUInt8(digest.length - 1) & 15
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

const matchingStep = (secret: Buffer, code: string, minimum = -1) => {
  if (!/^\d{6}$/.test(code)) return
  const current = Math.floor(Date.now() / 30_000)
  return [current, current - 1, current + 1].find(
    (counter) =>
      counter > minimum &&
      timingSafeEqual(Buffer.from(totpCode(secret, counter)), Buffer.from(code)),
  )
}

export const checkSecondFactor = (
  db: AppDatabase,
  directory: string,
  user: typeof users.$inferSelect,
  code?: string | null,
) => {
  if (!user.totpSecret) return
  if (!code) throw new DomainError('TOTP_REQUIRED', 'Enter the authentication code')
  if (!attempts.allow(user.id))
    throw new DomainError('RATE_LIMIT', 'Too many authentication attempts')
  const filter = and(eq(users.id, user.id), eq(users.totpSecret, user.totpSecret))
  if (user.totpRecoveryHash && hashToken(code.trim()) === user.totpRecoveryHash) {
    db.update(users).set({ totpRecoveryHash: null }).where(filter).run()
    return 'recovery' as const
  }
  const counter = matchingStep(
    decrypt(user.totpSecret, directory, user.id),
    code.trim(),
    user.totpCounter ?? -1,
  )
  if (counter === undefined) throw new DomainError('TOTP_INVALID', 'Invalid or already used code')
  db.update(users).set({ totpCounter: counter }).where(filter).run()
}

export const clearTotp = (db: AppDatabase, userId: string) =>
  db
    .update(users)
    .set({
      totpSecret: null,
      totpCounter: null,
      totpRecoveryHash: null,
      totpPending: null,
      totpPendingUntil: null,
    })
    .where(eq(users.id, userId))
    .run()

export const startTotp = (db: AppDatabase, directory: string, user: typeof users.$inferSelect) => {
  if (user.totpSecret)
    throw new DomainError('BAD_REQUEST', 'Two-factor authentication is already enabled')
  const secret = randomBytes(20)
  db.update(users)
    .set({
      totpPending: encrypt(secret, directory, user.id),
      totpPendingUntil: Date.now() + 10 * 60_000,
    })
    .where(eq(users.id, user.id))
    .run()
  return encodeBase32(secret)
}

export const enableTotp = (
  db: AppDatabase,
  directory: string,
  user: typeof users.$inferSelect,
  code: string,
) => {
  if (user.totpSecret || !user.totpPending || (user.totpPendingUntil ?? 0) <= Date.now()) {
    throw new DomainError('BAD_REQUEST', 'Start two-factor setup again')
  }
  if (!attempts.allow(user.id))
    throw new DomainError('RATE_LIMIT', 'Too many authentication attempts')
  const counter = matchingStep(decrypt(user.totpPending, directory, user.id), code)
  if (counter === undefined) throw new DomainError('TOTP_INVALID', 'Invalid authentication code')
  const recoveryCode = randomBytes(16).toString('hex')
  db.update(users)
    .set({
      totpSecret: user.totpPending,
      totpCounter: counter,
      totpRecoveryHash: hashToken(recoveryCode),
      totpPending: null,
      totpPendingUntil: null,
    })
    .where(eq(users.id, user.id))
    .run()
  return recoveryCode
}
