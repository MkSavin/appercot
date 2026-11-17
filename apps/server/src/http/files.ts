import { authenticateBotToken } from '../auth/bot-token'
import { getRequestSession } from '../auth/session'
import type { AppDatabase } from '../db/client'
import {
  FileRequestError,
  getAccessibleFile,
  getFilePath,
  MEDIA_MIME_TYPES,
  saveUploadedFile,
} from '../domain/files'
import type { AppEnv } from '../env'
import { textResponse } from './respond'

const getBearerToken = (request: Request) => {
  const authorization = request.headers.get('authorization')
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
}

const jsonFileResponse = (fileId: string) => Response.json({ fileId }, { status: 201 })

const fileError = (error: unknown) => {
  if (error instanceof FileRequestError) return textResponse(error.status, error.message)
  return textResponse(500, 'File operation failed')
}

export const uploadUserFile = async (
  request: Request,
  db: AppDatabase,
  env: AppEnv,
): Promise<Response> => {
  const session = getRequestSession(db, request)
  if (!session) return textResponse(401, 'Authentication required')
  try {
    const fileId = await saveUploadedFile(db, env, { type: 'user', id: session.user.id }, request)
    return jsonFileResponse(fileId)
  } catch (error) {
    return fileError(error)
  }
}

export const uploadBotFile = async (
  request: Request,
  db: AppDatabase,
  env: AppEnv,
): Promise<Response> => {
  const token = getBearerToken(request)
  const bot = token ? authenticateBotToken(db, token) : null
  if (!bot) return textResponse(401, 'Invalid bot token')
  try {
    const fileId = await saveUploadedFile(db, env, { type: 'bot', id: bot.id }, request)
    return jsonFileResponse(fileId)
  } catch (error) {
    return fileError(error)
  }
}

interface ByteRange {
  start: number
  end: number
}

const parseByteRange = (value: string, size: number): ByteRange | null => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim())
  if (!match || (!match[1] && !match[2])) return null
  const suffixLength =
    match[2] === '' && match[1] === '' ? 0 : Number(match[1] === '' ? match[2] : 0)
  const start = match[1] ? Number(match[1]) : Math.max(0, size - suffixLength)
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start > end ||
    start >= size ||
    (suffixLength === 0 && match[1] === '')
  ) {
    return null
  }
  return { start, end }
}

export const serveUserFile = (
  request: Request,
  fileId: string,
  db: AppDatabase,
  env: AppEnv,
): Response => {
  const session = getRequestSession(db, request)
  if (!session) return textResponse(401, 'Authentication required')
  try {
    const metadata = getAccessibleFile(db, fileId, session.user.id)
    const source = Bun.file(getFilePath(env, fileId))
    const rangeHeader = request.headers.get('range')
    const range = rangeHeader ? parseByteRange(rangeHeader, metadata.size) : null
    const headers = new Headers({
      'accept-ranges': 'bytes',
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': MEDIA_MIME_TYPES.has(metadata.mime)
        ? metadata.mime
        : 'application/octet-stream',
      'x-content-type-options': 'nosniff',
    })
    if (!MEDIA_MIME_TYPES.has(metadata.mime)) {
      headers.set(
        'content-disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(metadata.name)}`,
      )
    }
    if (rangeHeader && !range) {
      headers.set('content-range', `bytes */${metadata.size}`)
      return new Response(null, { status: 416, headers })
    }
    if (range) {
      const length = range.end - range.start + 1
      headers.set('content-range', `bytes ${range.start}-${range.end}/${metadata.size}`)
      headers.set('content-length', String(length))
      return new Response(source.slice(range.start, range.end + 1), { status: 206, headers })
    }
    headers.set('content-length', String(metadata.size))
    return new Response(source, { headers })
  } catch (error) {
    return fileError(error)
  }
}
