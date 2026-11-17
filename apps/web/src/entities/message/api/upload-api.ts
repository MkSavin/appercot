import type { Media } from '@appercot/protocol'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export const uploadChatMedia = async (chatId: string, file: File, request: Fetch = fetch) => {
  const body = new FormData()
  body.set('chatId', chatId)
  body.set('file', file)
  const response = await request('/api/files', {
    method: 'POST',
    credentials: 'same-origin',
    body,
  })
  if (!response.ok) throw new Error((await response.text()) || 'File upload failed')
  const result: unknown = await response.json()
  if (
    typeof result !== 'object' ||
    result === null ||
    !('fileId' in result) ||
    typeof result.fileId !== 'string'
  ) {
    throw new Error('Invalid file upload response')
  }
  return result.fileId
}

export const mediaKindForMime = (mime: string): Media['kind'] => {
  if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime)) return 'image'
  if (['video/mp4', 'video/webm'].includes(mime)) return 'video'
  if (['audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'].includes(mime)) return 'audio'
  return 'file'
}
