import { and, asc, eq, isNotNull, isNull, notInArray } from 'drizzle-orm'
import type { AppDatabase } from '../db/client'
import { files } from '../db/schema'
import type { AppEnv } from '../env'
import type { MediaStorage } from './media-storage'

const demuxers: Record<string, string> = {
  'image/jpeg': 'jpeg_pipe',
  'image/png': 'png_pipe',
  'image/webp': 'webp_pipe',
  'image/gif': 'gif',
  'video/mp4': 'mov',
  'video/quicktime': 'mov',
  'video/webm': 'matroska',
}

export const createMediaPreviews = (db: AppDatabase, env: AppEnv, storage: MediaStorage) => {
  const ffmpeg = env.MEDIA_FFMPEG ?? Bun.which('ffmpeg')
  const active = new Set<string>()
  const tasks = new Set<Promise<void>>()
  const processes = new Map<string, ReturnType<typeof Bun.spawn>>()
  let suspended = false

  const generate = async (file: typeof files.$inferSelect) => {
    const format = demuxers[file.mime]
    if (!ffmpeg || !format) return false
    const source = storage.source(file.storage, file.id)
    const protocols = file.storage === 's3' ? 'http,https,tcp,tls' : 'file'
    const process = Bun.spawn(
      [
        ffmpeg,
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-threads',
        '1',
        '-filter_threads',
        '1',
        '-max_alloc',
        '134217728',
        '-protocol_whitelist',
        protocols,
        '-f',
        format,
        ...(format === 'mov' ? ['-enable_drefs', '0'] : []),
        '-i',
        source,
        '-map',
        '0:v:0',
        '-frames:v',
        '1',
        '-vf',
        'scale=480:320:force_original_aspect_ratio=decrease',
        '-an',
        '-c:v',
        'mjpeg',
        '-threads',
        '1',
        '-q:v',
        '5',
        '-f',
        'image2pipe',
        'pipe:1',
      ],
      { stdout: 'pipe', stderr: 'ignore', timeout: 25_000 },
    )
    processes.set(file.id, process)
    let image: Uint8Array<ArrayBuffer>
    let code: number
    try {
      ;[image, code] = await Promise.all([new Response(process.stdout).bytes(), process.exited])
    } finally {
      processes.delete(file.id)
    }
    if (code !== 0 || image.length < 4 || image.length > 256_000) return false
    const stillAttached = db
      .select({ id: files.id })
      .from(files)
      .where(and(eq(files.id, file.id), isNotNull(files.chatId), isNull(files.detachedAt)))
      .get()
    if (!stillAttached) return false
    await storage.write(file.storage, file.id, image, 'image/jpeg', true)
    return true
  }

  const kick = () => {
    if (!ffmpeg || suspended) return
    while (active.size < 2) {
      const file = db
        .select()
        .from(files)
        .where(
          and(
            eq(files.previewState, 'pending'),
            isNotNull(files.chatId),
            isNull(files.detachedAt),
            active.size ? notInArray(files.id, [...active]) : undefined,
          ),
        )
        .orderBy(asc(files.id))
        .get()
      if (!file) return
      active.add(file.id)
      const task = generate(file)
        .catch(() => false)
        .then((ready) => {
          if (suspended) return
          db.update(files)
            .set({ previewState: ready ? 'ready' : 'unavailable' })
            .where(eq(files.id, file.id))
            .run()
        })
        .finally(() => {
          active.delete(file.id)
          tasks.delete(task)
          kick()
        })
        .catch(() => {})
      tasks.add(task)
    }
  }

  const ensure = (file: typeof files.$inferSelect) => {
    if (!ffmpeg || !demuxers[file.mime]) return 'unavailable'
    if (suspended) return 'pending'
    if (file.previewState === null) {
      db.update(files)
        .set({ previewState: 'pending' })
        .where(and(eq(files.id, file.id), isNull(files.previewState)))
        .run()
    }
    if (file.previewState === null || file.previewState === 'pending') {
      kick()
      return 'pending'
    }
    return file.previewState
  }
  const pause = async () => {
    suspended = true
    for (const process of processes.values()) process.kill()
    await Promise.all([...tasks])
  }
  const resume = () => {
    suspended = false
    kick()
  }
  return { kick, ensure, pause, resume }
}
