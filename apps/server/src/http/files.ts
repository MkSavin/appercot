import { authenticateBotToken } from '../auth/bot-token'
import { getRequestSession } from '../auth/session'
import type { AppDatabase } from '../db/client'
import {
  type FileOwner,
  getAccessibleFile,
  MEDIA_MIME_TYPES,
  saveUploadedFile,
} from '../domain/files'
import { FileRequestError, TransferCapacity } from '../domain/media-capacity'
import { createMediaPreviews } from '../domain/media-previews'
import type { MediaStorage } from '../domain/media-storage'
import type { AppEnv } from '../env'
import { textResponse } from './respond'

const fileError = (error: unknown) =>
  error instanceof FileRequestError
    ? textResponse(error.status, error.message)
    : textResponse(500, 'File operation failed')

const busy = () =>
  new Response('Too many simultaneous media transfers', {
    status: 429,
    headers: { 'retry-after': '3', 'cache-control': 'no-store' },
  })

const parseRange = (value: string, size: number) => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim())
  if (!match || (!match[1] && !match[2])) return null
  const suffix = match[1] ? undefined : Number(match[2])
  if (suffix !== undefined && (!Number.isSafeInteger(suffix) || suffix <= 0)) return null
  const start = suffix === undefined ? Number(match[1]) : Math.max(0, size - suffix)
  const end = suffix === undefined && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1
  return Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    start <= end &&
    start < size
    ? { start, end }
    : null
}

const withRelease = (input: ReadableStream<Uint8Array>, release: () => void) => {
  const reader = input.getReader()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const part = await reader.read()
        if (!part.done) {
          controller.enqueue(part.value)
          return
        }
        release()
        controller.close()
      } catch (error) {
        release()
        controller.error(error)
      }
    },
    async cancel(reason) {
      release()
      await reader.cancel(reason)
    },
  })
}

export const createFileHandlers = (db: AppDatabase, env: AppEnv, storage: MediaStorage) => {
  const uploads = new TransferCapacity(env.MEDIA_UPLOADS_PER_ACTOR, 16)
  const originals = new TransferCapacity(env.MEDIA_ORIGINALS_PER_USER, 64)
  const previews = createMediaPreviews(db, env, storage)
  previews.kick()

  const upload = async (request: Request, owner: FileOwner) => {
    const release = uploads.take(`${owner.type}:${owner.id}`)
    if (!release) return busy()
    try {
      const result = await saveUploadedFile(db, env, storage, owner, request)
      return Response.json(result, { status: 201 })
    } catch (error) {
      return fileError(error)
    } finally {
      release()
    }
  }

  return {
    pausePreviews: previews.pause,
    resumePreviews: previews.resume,
    limits: () => Response.json({ maxBytes: env.MEDIA_MAX_BYTES }),
    uploadUser: (request: Request) => {
      const session = getRequestSession(db, request)
      return session
        ? upload(request, { type: 'user', id: session.user.id })
        : Promise.resolve(textResponse(401, 'Authentication required'))
    },
    uploadBot: (request: Request) => {
      const token = request.headers.get('authorization')
      const bot = token?.startsWith('Bearer ') ? authenticateBotToken(db, token.slice(7)) : null
      return bot
        ? upload(request, { type: 'bot', id: bot.id })
        : Promise.resolve(textResponse(401, 'Invalid bot token'))
    },
    serve: async (request: Request, fileId: string, thumbnail: boolean) => {
      const session = getRequestSession(db, request)
      if (!session) return textResponse(401, 'Authentication required')
      try {
        const file = getAccessibleFile(db, fileId, session.user.id)
        const head = request.method === 'HEAD'
        if (thumbnail) {
          const preview = previews.ensure(file)
          if (preview !== 'ready')
            return new Response(null, {
              status: preview === 'pending' ? 202 : 404,
              headers: {
                'cache-control': 'no-store',
                ...(preview === 'pending' ? { 'retry-after': '2' } : {}),
              },
            })
          const etag = `"${file.id}-preview-v1"`
          const headers = {
            'cache-control': 'private, no-cache',
            etag,
            'content-type': 'image/jpeg',
            'x-content-type-options': 'nosniff',
          }
          if (request.headers.get('if-none-match') === etag)
            return new Response(null, { status: 304, headers })
          return new Response(head ? null : storage.blob(file.storage, file.id, true).stream(), {
            headers,
          })
        }
        const source = storage.blob(file.storage, file.id)
        const requested = request.headers.get('range')
        const range = requested ? parseRange(requested, file.size) : null
        const supported = MEDIA_MIME_TYPES.has(file.mime)
        const headers = new Headers({
          'accept-ranges': 'bytes',
          'cache-control': 'private, no-store',
          'content-type': supported ? file.mime : 'application/octet-stream',
          'x-content-type-options': 'nosniff',
        })
        if (!supported || new URL(request.url).searchParams.has('download'))
          headers.set(
            'content-disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
          )
        if (requested && !range) {
          headers.set('content-range', `bytes */${file.size}`)
          return new Response(null, { status: 416, headers })
        }
        if (range) headers.set('content-range', `bytes ${range.start}-${range.end}/${file.size}`)
        headers.set('content-length', String(range ? range.end - range.start + 1 : file.size))
        const status = range ? 206 : 200
        if (head) return new Response(null, { status, headers })
        const release = originals.take(session.user.id)
        if (!release) return busy()
        try {
          const stream = (range ? source.slice(range.start, range.end + 1) : source).stream()
          return new Response(withRelease(stream, release), { status, headers })
        } catch (error) {
          release()
          throw error
        }
      } catch (error) {
        return fileError(error)
      }
    },
  }
}
