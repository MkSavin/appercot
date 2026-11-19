import { z } from 'zod'

export const ERROR_CODES = {
  badRequest: 'BAD_REQUEST',
  unauthorized: 'UNAUTHORIZED',
  totpRequired: 'TOTP_REQUIRED',
  totpInvalid: 'TOTP_INVALID',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  botBlocked: 'BOT_BLOCKED',
  kvQuota: 'KV_QUOTA',
  rateLimit: 'RATE_LIMIT',
  internal: 'INTERNAL',
} as const

export const ErrorCodeSchema = z.enum(Object.values(ERROR_CODES))

export type ErrorCode = z.infer<typeof ErrorCodeSchema>
