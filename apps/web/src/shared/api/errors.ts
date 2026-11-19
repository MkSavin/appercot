import { ClientError } from 'graphql-request'
import { i18n } from '@/shared/config/i18n'

const t = i18n.t.bind(i18n)

import { toast } from '@/shared/lib/toast'

const protocolMessages: Record<string, string> = {
  TOTP_REQUIRED: t('errors:totpRequired'),
  TOTP_INVALID: t('errors:totpInvalid'),
  UNAUTHORIZED: t('errors:unauthorized'),
  FORBIDDEN: t('errors:forbidden'),
  BOT_BLOCKED: t('errors:blocked'),
  NOT_FOUND: t('errors:notFound'),
  RATE_LIMIT: t('errors:rateLimit'),
  KV_QUOTA: t('errors:quota'),
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
      return t('auth:invalidCredentials')
    }
    if (typeof code === 'string' && protocolMessages[code]) return protocolMessages[code]
    return error.response.errors?.[0]?.message ?? t('errors:network')
  }
  if (error instanceof Error && error.message) return error.message
  return t('errors:fallback')
}

export const showRequestError = (error: unknown) => {
  const message = getRequestErrorMessage(error)
  toast.error(message, { toasterId: 'appercot' })
  return message
}
