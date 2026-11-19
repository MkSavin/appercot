import type { Media } from '@appercot/protocol'
import { i18n } from '@/shared/config'

const t = i18n.t.bind(i18n)

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

let mediaPolicy: Promise<number | undefined> | undefined
export const fetchMediaLimit = () => {
  mediaPolicy ??= fetch('/api/files/limits')
    .then(async (response) => {
      if (!response.ok) throw new Error('Media limit unavailable')
      const result: unknown = await response.json()
      return result &&
        typeof result === 'object' &&
        'maxBytes' in result &&
        typeof result.maxBytes === 'number'
        ? result.maxBytes
        : undefined
    })
    .catch(() => {
      mediaPolicy = undefined
      return undefined
    })
  return mediaPolicy
}

export const uploadChatAttachment = async (chatId: string, file: File, request: Fetch = fetch) => {
  const response = await request(`/api/files?${new URLSearchParams({ chatId })}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': file.type || 'application/octet-stream',
      'x-file-name': encodeURIComponent(file.name),
    },
    body: file,
  })
  if (!response.ok)
    throw new Error(
      response.status === 413
        ? t('errors:uploadTooLarge')
        : response.status === 429
          ? t('errors:uploadRateLimit')
          : t('errors:uploadFailed'),
    )
  const result: unknown = await response.json()
  if (
    typeof result !== 'object' ||
    result === null ||
    !('fileId' in result) ||
    typeof result.fileId !== 'string'
  ) {
    throw new Error('Invalid file upload response')
  }
  return {
    fileId: result.fileId,
    mime: 'mime' in result && typeof result.mime === 'string' ? result.mime : file.type,
  }
}

export const uploadChatMedia = async (chatId: string, file: File, request: Fetch = fetch) =>
  (await uploadChatAttachment(chatId, file, request)).fileId

export const mediaKindForMime = (mime: string): Media['kind'] => {
  if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime)) return 'image'
  if (['video/mp4', 'video/webm', 'video/quicktime'].includes(mime)) return 'video'
  if (['audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'].includes(mime)) return 'audio'
  return 'file'
}
