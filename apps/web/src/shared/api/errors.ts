import { ClientError } from 'graphql-request'
import { strings } from '@/shared/config'
import { toast } from '@/shared/lib/toast'

const protocolMessages: Record<string, string> = {
  UNAUTHORIZED: strings.errors.unauthorized,
  FORBIDDEN: strings.errors.forbidden,
  BOT_BLOCKED: strings.errors.blocked,
  NOT_FOUND: strings.errors.notFound,
  RATE_LIMIT: strings.errors.rateLimit,
  KV_QUOTA: strings.errors.quota,
}

export const getRequestErrorMessage = (error: unknown) => {
  if (error instanceof ClientError) {
    const code = error.response.errors?.[0]?.extensions.code
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
