import { MAX_FILE } from '@appercot/protocol'
import { and, eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { chats, files } from '../db/schema'
import type { AppEnv } from '../env'

export const MEDIA_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
])

export class FileRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'FileRequestError'
  }
}

interface FileOwner {
  type: 'user' | 'bot'
  id: string
}

export const saveUploadedFile = async (
  db: AppDatabase,
  env: AppEnv,
  owner: FileOwner,
  request: Request,
) => {
  const form = await request.formData().catch(() => {
    throw new FileRequestError(400, 'Expected multipart form data')
  })
  const chatId = form.get('chatId')
  const upload = form.get('file')
  if (typeof chatId !== 'string' || !(upload instanceof File)) {
    throw new FileRequestError(400, 'chatId and file are required')
  }
  if (upload.size > MAX_FILE) throw new FileRequestError(413, 'File is too large')
  if (upload.type === 'image/svg+xml') throw new FileRequestError(415, 'SVG is not supported')
  const chat = db.select().from(chats).where(eq(chats.id, chatId)).get()
  const hasAccess =
    chat && (owner.type === 'user' ? chat.userId === owner.id : chat.botId === owner.id)
  if (!hasAccess) throw new FileRequestError(403, 'Chat access denied')

  const fileId = Bun.randomUUIDv7()
  const filePath = `${env.DATA_DIR}/files/${fileId}`
  await Bun.write(filePath, upload)
  const mime = MEDIA_MIME_TYPES.has(upload.type) ? upload.type : 'application/octet-stream'
  try {
    db.insert(files)
      .values({
        id: fileId,
        ownerType: owner.type,
        ownerId: owner.id,
        chatId,
        mime,
        size: upload.size,
        name: upload.name || 'file',
        createdAt: Date.now(),
      })
      .run()
  } catch (error) {
    await Bun.file(filePath).delete()
    throw error
  }
  return fileId
}

export const getAccessibleFile = (db: AppDatabase, fileId: string, userId: string) => {
  const file = db.select().from(files).where(eq(files.id, fileId)).get()
  if (!file) throw new FileRequestError(404, 'File was not found')
  const chat = file.chatId
    ? db
        .select()
        .from(chats)
        .where(and(eq(chats.id, file.chatId), eq(chats.userId, userId)))
        .get()
    : null
  if (!chat) throw new FileRequestError(403, 'File access denied')
  return file
}

export const getFilePath = (env: AppEnv, fileId: string) => `${env.DATA_DIR}/files/${fileId}`
