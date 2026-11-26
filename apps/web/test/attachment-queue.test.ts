import { describe, expect, test } from 'bun:test'
import type { UploadOptions, UploadResult } from '../src/entities/message'
import { UploadError } from '../src/entities/message'
import { createAttachmentQueue } from '../src/features/send-message/model/attachment-queue'

const policy = {
  maxFiles: 10,
  recommendedConcurrency: 2,
}

const file = (name: string, size = 4, type = 'image/png') =>
  new File([new Uint8Array(size)], name, { type, lastModified: 100 })

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const at = <T>(items: readonly T[], index: number) => {
  const item = items[index]
  if (!item) throw new Error(`Missing item ${index}`)
  return item
}

const controlledUploads = () => {
  const calls: Array<{
    file: File
    options: UploadOptions
    resolve: (result: UploadResult) => void
    reject: (error: UploadError) => void
  }> = []
  const upload = (_chatId: string, file: File, options: UploadOptions) => {
    let resolve!: (result: UploadResult) => void
    let reject!: (error: UploadError) => void
    const promise = new Promise<UploadResult>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    const call = { file, options, resolve, reject }
    calls.push(call)
    return {
      promise,
      abort: () => reject(new UploadError('ABORTED')),
    }
  }
  return { calls, upload }
}

const result = (file: File, index: number): UploadResult => ({
  fileId: `file-${index}`,
  mime: file.type,
  name: file.name,
  size: file.size,
})

describe('attachment queue', () => {
  // @anchor INV:attachment-queue/limits-files
  test('accepts at most ten files, reports duplicates and revokes previews', async () => {
    const revoked: string[] = []
    const queue = createAttachmentQueue({
      userId: 'user-1',
      chatId: 'chat-1',
      upload: controlledUploads().upload,
      policy: async () => policy,
      createObjectURL: (file) => `blob:${file.name}`,
      revokeObjectURL: (url) => revoked.push(url),
      localId: (() => {
        let id = 0
        return () => `local-${++id}`
      })(),
    })
    await queue.addFiles([])
    expect(queue.getSnapshot().items).toHaveLength(0)
    const files = Array.from({ length: 11 }, (_, index) => file(`image-${index}.png`))
    await queue.addFiles(files)
    expect(queue.getSnapshot().items).toHaveLength(10)
    expect(queue.getSnapshot().notice).toMatchObject({ code: 'TOO_MANY_FILES', count: 1 })

    await queue.addFiles([at(files, 0)])
    expect(queue.getSnapshot().items).toHaveLength(10)
    expect(queue.getSnapshot().notice).toMatchObject({ code: 'DUPLICATES_IGNORED', count: 1 })
    queue.dispose()
    expect(revoked).toHaveLength(10)
    expect(queue.getSnapshot().items).toEqual([])
  })

  test('validates maxBytes and unsupported SVG without blocking valid siblings', async () => {
    const { calls, upload } = controlledUploads()
    const queue = createAttachmentQueue({
      userId: 'user-1',
      chatId: 'chat-1',
      upload,
      policy: async () => ({ ...policy, maxBytes: 5 }),
    })
    await queue.addFiles([
      file('big.png', 6),
      file('vector.svg', 3, 'image/svg+xml'),
      file('ok.png'),
    ])
    expect(queue.getSnapshot().items.map((item) => item.status)).toEqual([
      'failed',
      'failed',
      'queued',
    ])
    expect(queue.getSnapshot().items[0]?.error).toMatchObject({ code: 'TOO_LARGE', limit: 5 })
    expect(queue.getSnapshot().items[1]?.error?.code).toBe('UNSUPPORTED')
    await expect(queue.uploadAll()).resolves.toBeUndefined()
    queue.remove(at(queue.getSnapshot().items, 0).localId)
    queue.remove(at(queue.getSnapshot().items, 0).localId)

    const submission = queue.uploadAll()
    await flush()
    expect(calls).toHaveLength(1)
    at(calls, 0).resolve(result(file('ok.png'), 1))
    await expect(submission).resolves.toMatchObject({ media: [{ fileId: 'file-1' }] })
    queue.dispose()
  })

  // @anchor INV:attachment-queue/retries-partial
  test('runs two uploads and retries only the failed sibling', async () => {
    const { calls, upload } = controlledUploads()
    const queue = createAttachmentQueue({
      userId: 'user-1',
      chatId: 'chat-1',
      upload,
      policy: async () => policy,
    })
    await queue.addFiles([file('one.png'), file('two.png'), file('three.png')])
    const firstSubmission = queue.uploadAll()
    await flush()
    expect(calls.map((call) => call.file.name)).toEqual(['one.png', 'two.png'])

    at(calls, 0).resolve(result(at(calls, 0).file, 1))
    await flush()
    expect(calls).toHaveLength(3)
    at(calls, 1).reject(new UploadError('NETWORK'))
    at(calls, 2).resolve(result(at(calls, 2).file, 3))
    await expect(firstSubmission).resolves.toBeUndefined()
    expect(queue.getSnapshot().items.map((item) => item.status)).toEqual([
      'ready',
      'failed',
      'ready',
    ])

    const failed = at(queue.getSnapshot().items, 1)
    queue.retry(failed.localId)
    await flush()
    expect(calls).toHaveLength(4)
    expect(calls[3]?.file.name).toBe('two.png')
    at(calls, 3).resolve(result(at(calls, 3).file, 2))
    await flush()
    const batch = await queue.uploadAll()
    expect(batch?.media.map((media) => media.fileId)).toEqual(['file-1', 'file-2', 'file-3'])
    expect(calls).toHaveLength(4)
    queue.dispose()
  })

  test('keeps server completion separate from 100 percent bytes and cleans ready previews', async () => {
    const { calls, upload } = controlledUploads()
    const revoked: string[] = []
    const queue = createAttachmentQueue({
      userId: 'user-1',
      chatId: 'chat-1',
      upload,
      policy: async () => policy,
      createObjectURL: () => 'blob:preview',
      revokeObjectURL: (url) => revoked.push(url),
    })
    await queue.addFiles([file('one.png', 10)])
    const submission = queue.uploadAll()
    await flush()
    at(calls, 0).options.onProgress?.({ loaded: 10, total: 10, lengthComputable: true })
    expect(at(queue.getSnapshot().items, 0).status).toBe('uploading')
    expect(at(queue.getSnapshot().items, 0).result).toBeUndefined()
    at(calls, 0).resolve(result(at(calls, 0).file, 1))
    const batch = await submission
    expect(queue.getSnapshot().items[0]?.status).toBe('ready')
    if (!batch) throw new Error('Upload did not complete')
    queue.removeReady(batch.ids)
    expect(revoked).toEqual(['blob:preview'])
    expect(queue.getSnapshot().items).toEqual([])
    queue.dispose()
  })

  test('cancels an active upload without applying its late result', async () => {
    const { calls, upload } = controlledUploads()
    const queue = createAttachmentQueue({
      userId: 'user-1',
      chatId: 'chat-1',
      upload,
      policy: async () => policy,
    })
    await queue.addFiles([file('one.png')])
    const submission = queue.uploadAll()
    await flush()
    queue.cancel(at(queue.getSnapshot().items, 0).localId)
    await expect(submission).resolves.toBeUndefined()
    expect(queue.getSnapshot().items[0]?.status).toBe('cancelled')
    at(calls, 0).resolve(result(at(calls, 0).file, 1))
    await flush()
    expect(queue.getSnapshot().items[0]?.status).toBe('cancelled')
    queue.dispose()
  })

  test('pauses queued uploads after 429 and resumes after Retry-After', async () => {
    const { calls, upload } = controlledUploads()
    let now = 1000
    let timer: (() => void) | undefined
    const queue = createAttachmentQueue({
      userId: 'user-1',
      chatId: 'chat-1',
      upload,
      policy: async () => policy,
      now: () => now,
      setTimeout: ((callback: () => void) => {
        timer = callback
        return 1
      }) as typeof setTimeout,
      clearTimeout: (() => {}) as typeof clearTimeout,
    })
    await queue.addFiles([file('one.png'), file('two.png'), file('three.png')])
    const submission = queue.uploadAll()
    await flush()
    at(calls, 0).reject(new UploadError('RATE_LIMIT', 429, 1000))
    await flush()
    expect(calls).toHaveLength(2)
    expect(queue.getSnapshot().items[0]).toMatchObject({
      status: 'queued',
      error: { code: 'RATE_LIMIT', retryAfter: 1000 },
    })

    now += 1000
    timer?.()
    await flush()
    expect(calls).toHaveLength(3)
    queue.dispose()
    await expect(submission).resolves.toBeUndefined()
  })

  test('waits for validation and shares the whole submit across composer instances', async () => {
    const { calls, upload } = controlledUploads()
    let resolvePolicy!: (value: typeof policy) => void
    const pendingPolicy = new Promise<typeof policy>((resolve) => (resolvePolicy = resolve))
    const queue = createAttachmentQueue({
      userId: 'user-1',
      chatId: 'chat-1',
      upload,
      policy: () => pendingPolicy,
    })
    const adding = queue.addFiles([file('one.png')])
    let operations = 0
    const operation = async () => {
      operations += 1
    }
    const first = queue.submit(operation)
    const second = queue.submit(operation)
    await flush()
    expect(calls).toHaveLength(0)
    resolvePolicy(policy)
    await adding
    await flush()
    expect(calls).toHaveLength(1)
    at(calls, 0).resolve(result(at(calls, 0).file, 1))
    expect(await first).toBe(true)
    expect(await second).toBe(true)
    expect(operations).toBe(1)
    expect(calls).toHaveLength(1)
    queue.dispose()
  })

  test('drops late responses and object URLs when the owner is reset', async () => {
    const { calls, upload } = controlledUploads()
    const revoked: string[] = []
    const queue = createAttachmentQueue({
      userId: 'user-1',
      chatId: 'chat-1',
      upload,
      policy: async () => policy,
      createObjectURL: () => 'blob:preview',
      revokeObjectURL: (url) => revoked.push(url),
    })
    await queue.addFiles([file('one.png')])
    const submission = queue.uploadAll()
    await flush()
    queue.dispose()
    await expect(submission).resolves.toBeUndefined()
    at(calls, 0).resolve(result(at(calls, 0).file, 1))
    await flush()
    expect(queue.getSnapshot().items).toEqual([])
    expect(revoked).toEqual(['blob:preview'])
  })
})
