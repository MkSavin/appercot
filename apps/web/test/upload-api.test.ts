import { describe, expect, test } from 'bun:test'
import {
  UploadError,
  type UploadProgress,
  uploadChatAttachment,
} from '../src/entities/message/api/upload-api'

class FakeXHR {
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onabort: (() => void) | null = null
  status = 0
  responseText = ''
  withCredentials = false
  method = ''
  url = ''
  body: unknown
  abortCalls = 0
  readonly headers = new Map<string, string>()
  readonly responseHeaders = new Map<string, string>()

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value)
  }

  getResponseHeader(name: string) {
    return this.responseHeaders.get(name) ?? null
  }

  send(body: unknown) {
    this.body = body
  }

  abort() {
    this.abortCalls += 1
    this.onabort?.()
  }

  progress(loaded: number, total: number, lengthComputable = true) {
    this.upload.onprogress?.({ loaded, total, lengthComputable } as ProgressEvent)
  }

  respond(status: number, body: unknown, headers: Record<string, string> = {}) {
    this.status = status
    this.responseText = typeof body === 'string' ? body : JSON.stringify(body)
    for (const [name, value] of Object.entries(headers)) this.responseHeaders.set(name, value)
    this.onload?.()
  }

  asXHR() {
    return this as unknown as XMLHttpRequest
  }
}

const file = () => new File(['image'], 'image.png', { type: 'image/png' })
const setup = () => {
  const xhr = new FakeXHR()
  const progress: UploadProgress[] = []
  const handle = uploadChatAttachment('chat-1', file(), {
    createXHR: () => xhr.asXHR(),
    onProgress: (event) => progress.push(event),
  })
  return { xhr, progress, handle }
}

describe('XHR upload adapter', () => {
  // @anchor INV:upload-api/tracks-upload
  test('sends the raw file and separates bytes progress from server completion', async () => {
    const { xhr, progress, handle } = setup()
    expect(xhr.method).toBe('POST')
    expect(xhr.url).toBe('/api/files?chatId=chat-1')
    expect(xhr.withCredentials).toBe(true)
    expect(xhr.headers.get('content-type')).toBe('image/png')
    expect(xhr.headers.get('x-file-name')).toBe('image.png')
    expect(xhr.body).toBeInstanceOf(File)

    xhr.progress(5, 10)
    xhr.progress(0, 0, false)
    expect(progress).toEqual([
      { loaded: 5, total: 10, lengthComputable: true },
      { loaded: 0, total: 0, lengthComputable: false },
    ])
    xhr.respond(201, { fileId: 'file-1', mime: 'image/png', name: 'image.png', size: 10 })
    await expect(handle.promise).resolves.toEqual({
      fileId: 'file-1',
      mime: 'image/png',
      name: 'image.png',
      size: 10,
    })
    handle.abort()
    expect(xhr.abortCalls).toBe(0)
  })

  test('rejects malformed successful responses', async () => {
    const { xhr, handle } = setup()
    xhr.respond(201, 'not json')
    await expect(handle.promise).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  test('distinguishes abort, network and timeout', async () => {
    const aborted = setup()
    aborted.handle.abort()
    await expect(aborted.handle.promise).rejects.toMatchObject({ code: 'ABORTED' })

    const network = setup()
    network.xhr.onerror?.()
    await expect(network.handle.promise).rejects.toMatchObject({ code: 'NETWORK' })

    const timeout = setup()
    timeout.xhr.ontimeout?.()
    await expect(timeout.handle.promise).rejects.toMatchObject({ code: 'TIMEOUT' })
  })

  test('maps HTTP errors and Retry-After to stable error codes', async () => {
    const cases = [
      [413, 'TOO_LARGE'],
      [415, 'UNSUPPORTED'],
      [401, 'UNAUTHORIZED'],
      [403, 'FORBIDDEN'],
      [500, 'SERVER'],
    ] as const
    for (const [status, code] of cases) {
      const { xhr, handle } = setup()
      xhr.respond(status, 'failed')
      await expect(handle.promise).rejects.toMatchObject({ code, status })
    }
    const { xhr, handle } = setup()
    xhr.respond(429, 'busy', { 'retry-after': '3' })
    await expect(handle.promise).rejects.toEqual(new UploadError('RATE_LIMIT', 429, 3000))
  })

  test('honors a signal aborted before the request starts', async () => {
    const controller = new AbortController()
    controller.abort()
    const xhr = new FakeXHR()
    const handle = uploadChatAttachment('chat-1', file(), {
      signal: controller.signal,
      createXHR: () => xhr.asXHR(),
    })
    await expect(handle.promise).rejects.toMatchObject({ code: 'ABORTED' })
    expect(xhr.method).toBe('')
  })
})
