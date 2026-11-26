import { MEDIA_MAX, type Media } from '@appercot/protocol'
import type { createChatStore } from '@/entities/chat'
import {
  fetchMediaPolicy,
  mediaKindForMime,
  UploadError,
  type UploadErrorCode,
  type UploadHandle,
  type UploadResult,
  uploadChatAttachment,
} from '@/entities/message'

export type AttachmentStatus =
  | 'selected'
  | 'queued'
  | 'uploading'
  | 'ready'
  | 'failed'
  | 'cancelled'

export interface AttachmentError {
  code: UploadErrorCode
  limit?: number
  retryAfter?: number
}

export interface AttachmentItem {
  localId: string
  file: File
  previewUrl?: string
  status: AttachmentStatus
  progress: { loaded: number; total: number; lengthComputable: boolean }
  attempts: number
  result?: UploadResult
  error?: AttachmentError
}

export interface AttachmentNotice {
  code: 'TOO_MANY_FILES' | 'DUPLICATES_IGNORED' | 'UPLOAD_INCOMPLETE'
  count?: number
  limit?: number
}

export interface AttachmentSnapshot {
  items: readonly AttachmentItem[]
  notice?: AttachmentNotice
}

export interface UploadBatch {
  ids: string[]
  media: Media[]
}

type Upload = typeof uploadChatAttachment

interface AttachmentQueueOptions {
  userId: string
  chatId: string
  upload?: Upload
  policy?: typeof fetchMediaPolicy
  createObjectURL?: (file: File) => string
  revokeObjectURL?: (url: string) => void
  localId?: () => string
  now?: () => number
  setTimeout?: typeof globalThis.setTimeout
  clearTimeout?: typeof globalThis.clearTimeout
}

interface Submission {
  ids: Set<string>
  resolve: (batch: UploadBatch | undefined) => void
}

const emptyProgress = { loaded: 0, total: 0, lengthComputable: false }
const duplicateKey = (file: File) => JSON.stringify([file.name, file.size, file.lastModified])
const permanentErrors = new Set<UploadErrorCode>([
  'TOO_LARGE',
  'UNSUPPORTED',
  'UNAUTHORIZED',
  'FORBIDDEN',
])

export const createAttachmentQueue = (options: AttachmentQueueOptions) => {
  const upload = options.upload ?? uploadChatAttachment
  const policy = options.policy ?? fetchMediaPolicy
  const now = options.now ?? Date.now
  const schedule = options.setTimeout ?? globalThis.setTimeout
  const cancelTimer = options.clearTimeout ?? globalThis.clearTimeout
  const localId = options.localId ?? (() => crypto.randomUUID())
  const handles = new Map<string, UploadHandle>()
  const listeners = new Set<() => void>()
  const submissions = new Set<Submission>()
  let snapshot: AttachmentSnapshot = { items: [] }
  let concurrency = 2
  let activeUploads = 0
  let rateLimitedUntil = 0
  let rateLimitTimer: ReturnType<typeof setTimeout> | undefined
  let pendingValidation: Promise<void> = Promise.resolve()
  let activeSubmission: Promise<boolean> | undefined
  let disposed = false

  const emit = () => {
    snapshot = { ...snapshot, items: [...snapshot.items] }
    for (const listener of listeners) listener()
    settleSubmissions()
  }

  const update = (localIdValue: string, changes: Partial<AttachmentItem>) => {
    snapshot = {
      ...snapshot,
      items: snapshot.items.map((item) =>
        item.localId === localIdValue ? { ...item, ...changes } : item,
      ),
    }
    emit()
  }

  const mediaFor = (item: AttachmentItem): Media | undefined =>
    item.result
      ? { fileId: item.result.fileId, kind: mediaKindForMime(item.result.mime) }
      : undefined

  function settleSubmissions() {
    for (const submission of [...submissions]) {
      const items = snapshot.items.filter((item) => submission.ids.has(item.localId))
      const incomplete = items.length !== submission.ids.size
      const failed = items.some((item) => item.status === 'failed' || item.status === 'cancelled')
      if (disposed || incomplete || failed) {
        submissions.delete(submission)
        submission.resolve(undefined)
        continue
      }
      if (items.every((item) => item.status === 'ready')) {
        submissions.delete(submission)
        submission.resolve({
          ids: items.map((item) => item.localId),
          media: items.map(mediaFor).filter((media): media is Media => Boolean(media)),
        })
      }
    }
  }

  const pump = () => {
    if (disposed || rateLimitedUntil > now()) return
    while (activeUploads < concurrency) {
      const item = snapshot.items.find((candidate) => candidate.status === 'queued')
      if (!item) return
      startUpload(item.localId)
    }
  }

  const startUpload = (localIdValue: string) => {
    const item = snapshot.items.find((candidate) => candidate.localId === localIdValue)
    if (item?.status !== 'queued' || disposed) return
    activeUploads += 1
    update(localIdValue, {
      status: 'uploading',
      progress: { ...emptyProgress },
      attempts: item.attempts + 1,
      error: undefined,
    })
    const handle = upload(options.chatId, item.file, {
      onProgress: (progress) => {
        const current = snapshot.items.find((candidate) => candidate.localId === localIdValue)
        if (current?.status === 'uploading') update(localIdValue, { progress })
      },
    })
    handles.set(localIdValue, handle)
    void handle.promise
      .then((result) => {
        handles.delete(localIdValue)
        activeUploads = Math.max(0, activeUploads - 1)
        const current = snapshot.items.find((candidate) => candidate.localId === localIdValue)
        if (!disposed && current?.status === 'uploading') {
          update(localIdValue, {
            status: 'ready',
            result,
            error: undefined,
            progress: {
              loaded: result.size ?? item.file.size,
              total: result.size ?? item.file.size,
              lengthComputable: true,
            },
          })
        }
      })
      .catch((error: unknown) => {
        handles.delete(localIdValue)
        activeUploads = Math.max(0, activeUploads - 1)
        const current = snapshot.items.find((candidate) => candidate.localId === localIdValue)
        if (!disposed && current?.status === 'uploading') {
          const failure = error instanceof UploadError ? error : new UploadError('NETWORK')
          if (failure.code === 'ABORTED') {
            update(localIdValue, { status: 'cancelled', error: failure })
          } else if (failure.code === 'RATE_LIMIT' && current.attempts < 3) {
            const retryAfter = failure.retryAfter ?? 3000
            rateLimitedUntil = now() + retryAfter
            update(localIdValue, {
              status: 'queued',
              error: { code: failure.code, retryAfter },
            })
            if (rateLimitTimer) cancelTimer(rateLimitTimer)
            rateLimitTimer = schedule(() => {
              rateLimitTimer = undefined
              pump()
            }, retryAfter)
          } else {
            update(localIdValue, {
              status: 'failed',
              error: {
                code: failure.code,
                retryAfter: failure.retryAfter,
              },
            })
          }
        }
      })
      .finally(pump)
  }

  const addFiles = async (files: Iterable<File>) => {
    if (disposed) return
    const seen = new Set(snapshot.items.map((item) => duplicateKey(item.file)))
    const candidates: File[] = []
    let duplicates = 0
    for (const file of files) {
      const key = duplicateKey(file)
      if (seen.has(key)) duplicates += 1
      else {
        seen.add(key)
        candidates.push(file)
      }
    }
    const capacity = Math.max(0, MEDIA_MAX - snapshot.items.length)
    const accepted = candidates.slice(0, capacity)
    const excess = candidates.length - accepted.length
    snapshot = {
      ...snapshot,
      notice:
        excess > 0
          ? { code: 'TOO_MANY_FILES', count: excess, limit: MEDIA_MAX }
          : duplicates > 0
            ? { code: 'DUPLICATES_IGNORED', count: duplicates }
            : undefined,
    }
    if (!accepted.length) {
      emit()
      return
    }
    const added = accepted.map<AttachmentItem>((file) => ({
      localId: localId(),
      file,
      previewUrl:
        mediaKindForMime(file.type) === 'image' && options.createObjectURL
          ? options.createObjectURL(file)
          : mediaKindForMime(file.type) === 'image' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(file)
            : undefined,
      status:
        file.type.toLowerCase() === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
          ? 'failed'
          : 'selected',
      progress: { ...emptyProgress },
      attempts: 0,
      ...(file.type.toLowerCase() === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
        ? { error: { code: 'UNSUPPORTED' as const } }
        : {}),
    }))
    snapshot = { ...snapshot, items: [...snapshot.items, ...added] }
    emit()

    const validate = async () => {
      const limits = await policy()
      if (disposed) return
      concurrency = limits.recommendedConcurrency
      for (const item of added) {
        const current = snapshot.items.find((candidate) => candidate.localId === item.localId)
        if (current?.status !== 'selected') continue
        if (limits.maxBytes && item.file.size > limits.maxBytes) {
          update(item.localId, {
            status: 'failed',
            error: { code: 'TOO_LARGE', limit: limits.maxBytes },
          })
        } else {
          update(item.localId, { status: 'queued' })
        }
      }
    }
    pendingValidation = pendingValidation.then(validate)
    await pendingValidation
  }

  const retry = (localIdValue: string) => {
    const item = snapshot.items.find((candidate) => candidate.localId === localIdValue)
    if (!item || !['failed', 'cancelled', 'queued'].includes(item.status) || disposed) return
    if (item.error && permanentErrors.has(item.error.code)) return
    if (rateLimitTimer) cancelTimer(rateLimitTimer)
    rateLimitTimer = undefined
    rateLimitedUntil = 0
    snapshot = { ...snapshot, notice: undefined }
    update(localIdValue, { status: 'queued', error: undefined })
    pump()
  }

  const cancel = (localIdValue: string) => {
    const item = snapshot.items.find((candidate) => candidate.localId === localIdValue)
    if (!item || !['queued', 'uploading', 'selected'].includes(item.status)) return
    if (item.status === 'uploading') handles.get(localIdValue)?.abort()
    else update(localIdValue, { status: 'cancelled', error: { code: 'ABORTED' } })
  }

  const remove = (localIdValue: string) => {
    const item = snapshot.items.find((candidate) => candidate.localId === localIdValue)
    if (!item) return
    handles.get(localIdValue)?.abort()
    if (item.previewUrl) {
      ;(options.revokeObjectURL ?? URL.revokeObjectURL)(item.previewUrl)
    }
    snapshot = {
      ...snapshot,
      items: snapshot.items.filter((candidate) => candidate.localId !== localIdValue),
    }
    emit()
    pump()
  }

  const uploadAll = async () => {
    if (disposed) return undefined
    await pendingValidation
    if (disposed) return undefined
    const ids = new Set(snapshot.items.map((item) => item.localId))
    if (!ids.size) return { ids: [], media: [] }
    if (snapshot.items.some((item) => item.status === 'failed' || item.status === 'cancelled')) {
      snapshot = { ...snapshot, notice: { code: 'UPLOAD_INCOMPLETE' } }
      emit()
      return undefined
    }
    snapshot = { ...snapshot, notice: undefined }
    return new Promise<UploadBatch | undefined>((resolve) => {
      const submission = { ids, resolve }
      submissions.add(submission)
      for (const item of snapshot.items) {
        if (item.status === 'selected') update(item.localId, { status: 'queued' })
      }
      pump()
      settleSubmissions()
    })
  }

  const submit = async (operation: (batch: UploadBatch) => Promise<void>) => {
    if (activeSubmission) return activeSubmission
    const submission = (async () => {
      const batch = await uploadAll()
      if (!batch) return false
      await operation(batch)
      removeReady(batch.ids)
      return true
    })()
    activeSubmission = submission
    try {
      return await submission
    } finally {
      if (activeSubmission === submission) activeSubmission = undefined
    }
  }

  const removeReady = (localIds: string[]) => {
    const ids = new Set(localIds)
    for (const item of snapshot.items) {
      if (ids.has(item.localId) && item.status === 'ready') remove(item.localId)
    }
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    if (rateLimitTimer) cancelTimer(rateLimitTimer)
    rateLimitTimer = undefined
    for (const handle of handles.values()) handle.abort()
    handles.clear()
    for (const item of snapshot.items) {
      if (item.previewUrl) (options.revokeObjectURL ?? URL.revokeObjectURL)(item.previewUrl)
    }
    snapshot = { items: [] }
    for (const submission of submissions) submission.resolve(undefined)
    submissions.clear()
    for (const listener of listeners) listener()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    addFiles,
    uploadAll,
    submit,
    retry,
    cancel,
    remove,
    removeReady,
    dispose,
    pump,
  }
}

export type AttachmentQueue = ReturnType<typeof createAttachmentQueue>

const queues = new Map<string, AttachmentQueue>()
const queueKey = (userId: string, chatId: string) => JSON.stringify([userId, chatId])

export const attachmentQueueFor = (userId: string, chatId: string) => {
  const key = queueKey(userId, chatId)
  let queue = queues.get(key)
  if (!queue) {
    queue = createAttachmentQueue({ userId, chatId })
    queues.set(key, queue)
  }
  return queue
}

export const resetAttachmentQueues = (userId: string, chatId?: string) => {
  for (const [key, queue] of [...queues]) {
    const [recordUserId, recordChatId] = JSON.parse(key) as [string, string]
    if (recordUserId === userId && (!chatId || recordChatId === chatId)) {
      queue.dispose()
      queues.delete(key)
    }
  }
}

export const observeAttachmentQueues = (
  store: ReturnType<typeof createChatStore>,
  userId: string,
) => {
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.user?.id !== userId || previous.user?.id !== userId) return
    for (const chat of previous.chats) {
      const current = state.chats.find((candidate) => candidate.id === chat.id)
      if (!current || (!chat.blocked && current.blocked)) resetAttachmentQueues(userId, chat.id)
    }
  })
  return () => {
    unsubscribe()
    resetAttachmentQueues(userId)
  }
}
