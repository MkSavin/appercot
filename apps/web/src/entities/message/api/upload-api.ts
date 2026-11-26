import { MEDIA_MAX, type Media } from '@appercot/protocol'

export interface MediaPolicy {
  maxBytes?: number
  maxFiles: number
  recommendedConcurrency: number
}

const defaultMediaPolicy: MediaPolicy = {
  maxFiles: MEDIA_MAX,
  recommendedConcurrency: 2,
}

export const parseMediaPolicy = (value: unknown): MediaPolicy => {
  if (typeof value !== 'object' || value === null) return defaultMediaPolicy
  const maxBytes =
    'maxBytes' in value &&
    typeof value.maxBytes === 'number' &&
    Number.isSafeInteger(value.maxBytes) &&
    value.maxBytes >= 0
      ? value.maxBytes
      : undefined
  const maxFiles =
    'maxFiles' in value &&
    typeof value.maxFiles === 'number' &&
    Number.isInteger(value.maxFiles) &&
    value.maxFiles > 0 &&
    value.maxFiles <= MEDIA_MAX
      ? value.maxFiles
      : MEDIA_MAX
  const recommendedConcurrency =
    'recommendedConcurrency' in value &&
    typeof value.recommendedConcurrency === 'number' &&
    Number.isInteger(value.recommendedConcurrency) &&
    value.recommendedConcurrency > 0 &&
    value.recommendedConcurrency <= 32
      ? value.recommendedConcurrency
      : 2
  return { maxBytes, maxFiles, recommendedConcurrency }
}

let mediaPolicy: Promise<MediaPolicy> | undefined
export const fetchMediaPolicy = () => {
  mediaPolicy ??= fetch('/api/files/limits')
    .then(async (response) => {
      if (!response.ok) throw new Error('Media policy unavailable')
      return parseMediaPolicy(await response.json())
    })
    .catch(() => {
      mediaPolicy = undefined
      return defaultMediaPolicy
    })
  return mediaPolicy
}

export const fetchMediaLimit = async () => (await fetchMediaPolicy()).maxBytes

export type UploadErrorCode =
  | 'ABORTED'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'TOO_LARGE'
  | 'UNSUPPORTED'
  | 'RATE_LIMIT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SERVER'
  | 'INVALID_RESPONSE'

export class UploadError extends Error {
  constructor(
    readonly code: UploadErrorCode,
    readonly status?: number,
    readonly retryAfter?: number,
  ) {
    super(code)
    this.name = 'UploadError'
  }
}

export interface UploadResult {
  fileId: string
  mime: string
  name?: string
  size?: number
}

export interface UploadProgress {
  loaded: number
  total: number
  lengthComputable: boolean
}

export interface UploadOptions {
  signal?: AbortSignal
  onProgress?: (progress: UploadProgress) => void
  createXHR?: () => XMLHttpRequest
}

export interface UploadHandle {
  promise: Promise<UploadResult>
  abort: () => void
}

const retryAfterMilliseconds = (value: string | null) => {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined
}

const statusError = (xhr: XMLHttpRequest): UploadError => {
  const retryAfter = retryAfterMilliseconds(xhr.getResponseHeader('retry-after'))
  if (xhr.status === 413) return new UploadError('TOO_LARGE', xhr.status)
  if (xhr.status === 415) return new UploadError('UNSUPPORTED', xhr.status)
  if (xhr.status === 429) return new UploadError('RATE_LIMIT', xhr.status, retryAfter)
  if (xhr.status === 401) return new UploadError('UNAUTHORIZED', xhr.status)
  if (xhr.status === 403) return new UploadError('FORBIDDEN', xhr.status)
  return new UploadError('SERVER', xhr.status, retryAfter)
}

const responseResult = (xhr: XMLHttpRequest, file: File): UploadResult => {
  let result: unknown
  try {
    result = JSON.parse(xhr.responseText)
  } catch {
    throw new UploadError('INVALID_RESPONSE', xhr.status)
  }
  if (
    typeof result !== 'object' ||
    result === null ||
    !('fileId' in result) ||
    typeof result.fileId !== 'string' ||
    !result.fileId
  ) {
    throw new UploadError('INVALID_RESPONSE', xhr.status)
  }
  const mime = 'mime' in result && typeof result.mime === 'string' ? result.mime : file.type
  const name = 'name' in result && typeof result.name === 'string' ? result.name : undefined
  const size =
    'size' in result &&
    typeof result.size === 'number' &&
    Number.isSafeInteger(result.size) &&
    result.size >= 0
      ? result.size
      : undefined
  return { fileId: result.fileId, mime: mime || 'application/octet-stream', name, size }
}

export const uploadChatAttachment = (
  chatId: string,
  file: File,
  options: UploadOptions = {},
): UploadHandle => {
  const xhr = options.createXHR?.() ?? new XMLHttpRequest()
  let settled = false
  let resolvePromise: (result: UploadResult) => void
  let rejectPromise: (error: UploadError) => void
  const promise = new Promise<UploadResult>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  const cleanup = () => {
    xhr.onload = null
    xhr.onerror = null
    xhr.ontimeout = null
    xhr.onabort = null
    xhr.upload.onprogress = null
    options.signal?.removeEventListener('abort', abort)
  }
  const resolve = (result: UploadResult) => {
    if (settled) return
    settled = true
    cleanup()
    resolvePromise(result)
  }
  const reject = (error: UploadError) => {
    if (settled) return
    settled = true
    cleanup()
    rejectPromise(error)
  }
  const abort = () => {
    if (settled) return
    xhr.abort()
  }

  if (options.signal?.aborted) {
    reject(new UploadError('ABORTED'))
    return { promise, abort }
  }

  xhr.upload.onprogress = (event) => {
    if (
      !event.lengthComputable ||
      !Number.isFinite(event.loaded) ||
      !Number.isFinite(event.total) ||
      event.total <= 0
    ) {
      options.onProgress?.({ loaded: 0, total: 0, lengthComputable: false })
      return
    }
    options.onProgress?.({
      loaded: Math.min(event.loaded, event.total),
      total: event.total,
      lengthComputable: true,
    })
  }
  xhr.onload = () => {
    if (xhr.status < 200 || xhr.status >= 300) {
      reject(statusError(xhr))
      return
    }
    try {
      resolve(responseResult(xhr, file))
    } catch (error) {
      reject(error instanceof UploadError ? error : new UploadError('INVALID_RESPONSE', xhr.status))
    }
  }
  xhr.onerror = () => reject(new UploadError('NETWORK', xhr.status))
  xhr.ontimeout = () => reject(new UploadError('TIMEOUT', xhr.status))
  xhr.onabort = () => reject(new UploadError('ABORTED', xhr.status))
  options.signal?.addEventListener('abort', abort, { once: true })

  try {
    xhr.open('POST', `/api/files?${new URLSearchParams({ chatId })}`)
    xhr.withCredentials = true
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name))
    xhr.send(file)
  } catch {
    reject(new UploadError('NETWORK'))
  }
  return { promise, abort }
}

export const mediaKindForMime = (mime: string): Media['kind'] => {
  if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime)) return 'image'
  if (['video/mp4', 'video/webm', 'video/quicktime'].includes(mime)) return 'video'
  if (['audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'].includes(mime)) return 'audio'
  return 'file'
}
