import { ClientError } from 'graphql-request'
import { strings } from '@/shared/config'
import { toast } from '@/shared/lib/toast'

const protocolMessages: Record<string, string> = {
  TOTP_REQUIRED: 'Введите код из приложения 2FA или резервный код.',
  TOTP_INVALID: 'Код неверен или уже использован.',
  UNAUTHORIZED: strings.errors.unauthorized,
  FORBIDDEN: strings.errors.forbidden,
  BOT_BLOCKED: strings.errors.blocked,
  NOT_FOUND: strings.errors.notFound,
  RATE_LIMIT: strings.errors.rateLimit,
  KV_QUOTA: strings.errors.quota,
}

export const getRequestErrorCode = (error: unknown) =>
  error instanceof ClientError ? error.response.errors?.[0]?.extensions?.code : undefined

export const getRequestErrorMessage = (
  error: unknown,
  context: 'authentication' | 'session' = 'session',
) => {
  if (error instanceof ClientError) {
    const code = getRequestErrorCode(error)
    if (code === 'UNAUTHORIZED' && context === 'authentication') {
      return strings.auth.invalidCredentials
    }
    if (typeof code === 'string' && protocolMessages[code]) return protocolMessages[code]
    return error.response.errors?.[0]?.message ?? strings.errors.network
  }
  if (error instanceof Error && error.message) return error.message
  return strings.errors.fallback
}

export const showRequestError = (error: unknown) => {
  const message = getRequestErrorMessage(error)
  toast.error(message, { toasterId: 'appercot' })
  return message
}
