import { and, eq, isNull } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { chats, files } from '../db/schema'
import type { AppEnv } from '../env'
import { FileRequestError } from './media-capacity'
import type { MediaStorage } from './media-storage'
import { downloadMedia } from './media-url'

export const S3_MAX_BYTES = 5 * 1024 ** 4
const legacyMaxBytes = 64 * 1024 ** 2
const extensions: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
}
export const MEDIA_MIME_TYPES = new Set([...Object.values(extensions), 'audio/x-m4a'])
export interface FileOwner {
  type: 'user' | 'bot'
  id: string
}

const fileSize = (value?: string | null) => {
  if (!value || !/^\d+$/.test(value)) return undefined
  const size = Number(value)
  return Number.isSafeInteger(size) ? size : Infinity
}

const decodeName = (name: string) => {
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}
const readName = (name: string) =>
  decodeName(name)
    .split(/[\\/]/)
    .pop()
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Strip control characters from untrusted filenames.
    ?.replace(/[\u0000-\u001f\u007f]/gu, '')
    .trim()
    .slice(0, 240) || 'file'

const limitStream = (
  body: ReadableStream<Uint8Array>,
  limit: number,
  report: (size: number) => void = () => {},
) => {
  let size = 0
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength
        report(size)
        if (size > limit) throw new FileRequestError(413, 'File is too large')
        controller.enqueue(chunk)
      },
    }),
  )
}

const readSource = async (
  request: Request,
  env: AppEnv,
  owner: FileOwner,
  checkChat: (chatId: string) => void,
) => {
  const type = request.headers.get('content-type') ?? ''
  const length = fileSize(request.headers.get('content-length'))
  const url = new URL(request.url)
  if (!request.body) throw new FileRequestError(400, 'File is required')
  if (type.startsWith('multipart/form-data')) {
    if ((length ?? 0) > legacyMaxBytes)
      throw new FileRequestError(413, 'Use streaming upload for large files')
    const form = await new Response(limitStream(request.body, legacyMaxBytes), {
      headers: { 'content-type': type },
    })
      .formData()
      .catch((error) => {
        throw error instanceof FileRequestError
          ? error
          : new FileRequestError(400, 'Expected multipart form data')
      })
    const chatId = form.get('chatId')
    const file = form.get('file')
    if (typeof chatId !== 'string' || !(file instanceof File))
      throw new FileRequestError(400, 'chatId and file are required')
    checkChat(chatId)
    return { chatId, body: file.stream(), mime: file.type, name: file.name, size: file.size }
  }
  const chatId = url.searchParams.get('chatId')
  if (!chatId) throw new FileRequestError(400, 'chatId is required')
  checkChat(chatId)
  if (url.searchParams.get('source') === 'url') {
    if (owner.type !== 'bot') throw new FileRequestError(403, 'Only bots can import URLs')
    if ((length ?? 0) > 12_000) throw new FileRequestError(413, 'Media URL payload is too large')
    const payload: unknown = await new Response(limitStream(request.body, 12_000))
      .json()
      .catch((error) => {
        throw error instanceof FileRequestError
          ? error
          : new FileRequestError(400, 'Invalid media URL payload')
      })
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('url' in payload) ||
      typeof payload.url !== 'string'
    )
      throw new FileRequestError(400, 'Media URL is required')
    const remote = await downloadMedia(payload.url, env.MEDIA_TRUSTED_HOSTS, request.signal)
    return {
      chatId,
      body: remote.body,
      mime: 'mime' in payload && typeof payload.mime === 'string' ? payload.mime : remote.mime,
      name: 'name' in payload && typeof payload.name === 'string' ? payload.name : remote.name,
      size: fileSize(remote.length),
    }
  }
  return {
    chatId,
    body: request.body,
    mime: type,
    name: request.headers.get('x-file-name') ?? 'file',
    size: length,
  }
}

export const saveUploadedFile = async (
  db: AppDatabase,
  env: AppEnv,
  storage: MediaStorage,
  owner: FileOwner,
  request: Request,
) => {
  const checkChat = (chatId: string) => {
    const member = db
      .select({ id: chats.id })
      .from(chats)
      .where(
        and(
          eq(chats.id, chatId),
          isNull(chats.revokedAt),
          isNull(chats.blockedAt),
          eq(chats.guest, false),
          eq(owner.type === 'user' ? chats.userId : chats.botId, owner.id),
        ),
      )
      .get()
    if (!member) throw new FileRequestError(403, 'Chat access denied')
  }
  const source = await readSource(request, env, owner, checkChat)
  const storageLimit = storage.kind === 's3' ? S3_MAX_BYTES : Number.MAX_SAFE_INTEGER
  const limit = env.MEDIA_MAX_BYTES ? Math.min(env.MEDIA_MAX_BYTES, storageLimit) : storageLimit
  const declared = source.mime.split(';')[0]?.trim().toLowerCase() ?? ''
  const name = readName(source.name)
  if ((source.size ?? 0) > limit || declared === 'image/svg+xml') {
    await source.body.cancel().catch(() => {})
    if (declared === 'image/svg+xml') throw new FileRequestError(415, 'SVG is not supported')
    throw new FileRequestError(413, 'File is too large')
  }
  const guessed =
    declared === '' || declared === 'application/octet-stream'
      ? extensions[name.split('.').pop()?.toLowerCase() ?? '']
      : declared
  const mime = guessed && MEDIA_MIME_TYPES.has(guessed) ? guessed : 'application/octet-stream'
  const fileId = Bun.randomUUIDv7()
  let size = 0
  const limited = limitStream(source.body, limit, (value) => {
    size = value
  })
  try {
    await storage.write(storage.kind, fileId, limited, mime)
    if (source.size !== undefined && source.size !== size)
      throw new FileRequestError(422, 'File transfer did not complete')
    checkChat(source.chatId)
    db.insert(files)
      .values({
        id: fileId,
        ownerType: owner.type,
        ownerId: owner.id,
        chatId: source.chatId,
        originChatId: source.chatId,
        mime,
        size,
        name,
        storage: storage.kind,
        attached: false,
        createdAt: Date.now(),
      })
      .run()
  } catch (error) {
    await limited.cancel().catch(() => {})
    await storage.remove(storage.kind, fileId).catch(() => {})
    if (size > limit) throw new FileRequestError(413, 'File is too large')
    throw error
  }
  return { fileId, mime, name, size }
}

export const getAccessibleFile = (db: AppDatabase, fileId: string, userId: string) => {
  const file = db.select().from(files).where(eq(files.id, fileId)).get()
  if (!file) throw new FileRequestError(404, 'File was not found')
  const chat = file.chatId
    ? db
        .select({ id: chats.id })
        .from(chats)
        .where(
          and(
            eq(chats.id, file.chatId),
            eq(chats.userId, userId),
            isNull(chats.revokedAt),
            eq(chats.guest, false),
          ),
        )
        .get()
    : null
  if (!chat) throw new FileRequestError(403, 'File access denied')
  return file
}
