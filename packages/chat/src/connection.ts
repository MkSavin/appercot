import {
  type BotEvent,
  type BotMethod,
  BotMethods,
  type ErrorCode,
  type Params,
  type Result,
  ServerToBotFrameSchema,
} from '@appercot/protocol'
import type { UploadOptions, UploadSource } from './media'

export class BotApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'BotApiError'
  }
}

interface PendingCall {
  method: BotMethod
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface ConnectionOptions {
  url: string
  token: string
  ackOnError: boolean
  onEvent: (event: BotEvent) => Promise<void>
  onHello?: () => Promise<void>
  configuresOnHello?: () => boolean
}

export class BotConnection {
  private socket?: WebSocket
  private running = false
  private ready = false
  private initialization?: Promise<void>
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private ackTimer?: ReturnType<typeof setTimeout>
  private reconnectDelay = 500
  private readonly pending = new Map<string, PendingCall>()
  private readonly readyWaiters: Array<{ resolve: () => void; reject: (error: Error) => void }> = []
  private readonly acknowledgements = new Set<number>()

  constructor(private readonly options: ConnectionOptions) {}

  start() {
    if (this.ready) return this.initialization ?? Promise.resolve()
    const waiting = this.waitUntilReady()
    if (this.running) return waiting
    this.running = true
    try {
      this.connect()
    } catch (error) {
      this.shutdown(error instanceof Error ? error : new Error(String(error)))
    }
    return waiting
  }

  stop() {
    this.shutdown(new Error('Connection stopped'))
  }

  private waitUntilReady() {
    return new Promise<void>((resolve, reject) => this.readyWaiters.push({ resolve, reject }))
  }

  private shutdown(error: Error) {
    this.running = false
    this.ready = false
    this.initialization = undefined
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.ackTimer) clearTimeout(this.ackTimer)
    this.reconnectTimer = undefined
    this.ackTimer = undefined
    this.reconnectDelay = 500
    this.acknowledgements.clear()
    const socket = this.socket
    this.socket = undefined
    socket?.close()
    for (const { reject } of this.readyWaiters.splice(0)) reject(error)
    this.rejectPending(error)
  }

  async call<Method extends BotMethod>(
    method: Method,
    params: Params<Method>,
  ): Promise<Result<Method>> {
    if (!this.ready) await this.start()
    const socket = this.socket
    if (!this.ready || !socket) throw new Error('Connection closed')
    const id = globalThis.crypto.randomUUID()
    const result = new Promise<unknown>((resolve, reject) => {
      socket.send(JSON.stringify({ t: 'req', id, method, params }))
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC ${method} timed out`))
      }, 15_000)
      this.pending.set(id, { method, resolve, reject, timer })
    })
    return result as Promise<Result<Method>>
  }

  async uploadFile(chatId: string, source: UploadSource, options: UploadOptions = {}) {
    const url = new URL(this.options.url)
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
    url.pathname = '/api/bot/files'
    url.search = ''
    url.searchParams.set('chatId', chatId)
    const headers = new Headers({ authorization: `Bearer ${this.options.token}` })
    let body: BodyInit
    if (typeof source === 'string' || source instanceof URL) {
      url.searchParams.set('source', 'url')
      headers.set('content-type', 'application/json')
      body = JSON.stringify({ url: String(source), name: options.name, mime: options.mime })
    } else {
      const filename = options.name ?? (source instanceof File ? source.name : 'file')
      headers.set('x-file-name', encodeURIComponent(filename))
      headers.set(
        'content-type',
        options.mime ??
          (source instanceof Blob && source.type ? source.type : 'application/octet-stream'),
      )
      body =
        source instanceof Uint8Array && !(source.buffer instanceof ArrayBuffer)
          ? Uint8Array.from(source)
          : (source as BodyInit)
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: options.signal,
    })
    const result: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const code =
        response.status === 401
          ? 'UNAUTHORIZED'
          : response.status === 403
            ? 'FORBIDDEN'
            : response.status === 404
              ? 'NOT_FOUND'
              : response.status === 429
                ? 'RATE_LIMIT'
                : 'BAD_REQUEST'
      throw new BotApiError(
        code,
        response.status === 413
          ? 'File is too large'
          : `Media transfer failed (${response.status})`,
      )
    }
    if (
      typeof result !== 'object' ||
      result === null ||
      !('fileId' in result) ||
      typeof result.fileId !== 'string'
    ) {
      throw new Error('Invalid file upload response')
    }
    return {
      fileId: result.fileId,
      mime:
        'mime' in result && typeof result.mime === 'string'
          ? result.mime
          : 'application/octet-stream',
    }
  }

  private connect() {
    const url = new URL(this.options.url)
    url.searchParams.set('token', this.options.token)
    if (this.options.configuresOnHello?.()) url.searchParams.set('configure', '1')
    const socket = new WebSocket(url)
    this.socket = socket
    socket.addEventListener('message', (event) => {
      if (this.socket === socket) this.handleMessage(socket, String(event.data))
    })
    socket.addEventListener('close', () => {
      if (this.socket !== socket) return
      this.socket = undefined
      this.ready = false
      this.initialization = undefined
      this.rejectPending(new Error('Connection closed'))
      if (this.running) this.scheduleReconnect()
    })
    socket.addEventListener('error', () => socket.close())
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    const jitter = Math.random() * this.reconnectDelay * 0.2
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      if (this.running) this.connect()
    }, this.reconnectDelay + jitter)
    this.reconnectDelay = Math.min(30_000, this.reconnectDelay * 2)
  }

  private handleMessage(socket: WebSocket, frame: string) {
    let json: unknown
    try {
      json = JSON.parse(frame)
    } catch {
      return
    }
    const parsed = ServerToBotFrameSchema.safeParse(json)
    if (!parsed.success) return
    const message = parsed.data
    if (message.t === 'hello') {
      this.ready = true
      this.reconnectDelay = 500
      this.initialization = this.options.onHello?.() ?? Promise.resolve()
      void this.initialization
        .then(() => {
          if (this.socket !== socket) return
          for (const { resolve } of this.readyWaiters.splice(0)) resolve()
        })
        .catch((error: unknown) => {
          if (this.socket === socket)
            this.shutdown(error instanceof Error ? error : new Error(String(error)))
        })
      if (this.acknowledgements.size) this.flushAcknowledgements()
      return
    }
    if (message.t === 'res') {
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      clearTimeout(pending.timer)
      if (message.ok) {
        const result = BotMethods[pending.method].result.safeParse(message.result)
        if (result.success) pending.resolve(result.data)
        else pending.reject(result.error)
      } else {
        pending.reject(new BotApiError(message.error.code, message.error.message))
      }
      return
    }
    void this.processEvent(socket, message.seq, message.event)
  }

  private async processEvent(socket: WebSocket, seq: number, event: BotEvent) {
    try {
      await this.initialization
    } catch {
      return
    }
    if (this.socket !== socket) return
    try {
      await this.options.onEvent(event)
    } catch {
      if (!this.options.ackOnError) return
    }
    if (this.socket === socket) this.queueAcknowledgement(seq)
  }

  private queueAcknowledgement(seq: number) {
    this.acknowledgements.add(seq)
    if (this.acknowledgements.size >= 50) {
      this.flushAcknowledgements()
      return
    }
    if (this.ackTimer) return
    this.ackTimer = setTimeout(() => this.flushAcknowledgements(), 100)
  }

  private flushAcknowledgements() {
    if (this.ackTimer) clearTimeout(this.ackTimer)
    this.ackTimer = undefined
    if (!this.ready || this.socket?.readyState !== WebSocket.OPEN) return
    for (const seq of this.acknowledgements) {
      this.socket.send(JSON.stringify({ t: 'ack', seq }))
    }
    this.acknowledgements.clear()
  }

  private rejectPending(error: Error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }
}
