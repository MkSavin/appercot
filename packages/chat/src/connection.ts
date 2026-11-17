import {
  type BotEvent,
  type BotMethod,
  BotMethods,
  type ErrorCode,
  type Params,
  type Result,
  ServerToBotFrameSchema,
} from '@appercot/protocol'

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
}

export class BotConnection {
  private socket?: WebSocket
  private running = false
  private ready = false
  private startPromise?: Promise<void>
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private ackTimer?: ReturnType<typeof setTimeout>
  private reconnectDelay = 500
  private readonly pending = new Map<string, PendingCall>()
  private readonly readyWaiters: Array<() => void> = []
  private readonly acknowledgements = new Set<number>()

  constructor(private readonly options: ConnectionOptions) {}

  start() {
    if (this.startPromise) return this.startPromise
    this.running = true
    this.startPromise = new Promise<void>((resolve) => {
      this.readyWaiters.push(resolve)
      this.connect()
    })
    return this.startPromise
  }

  stop() {
    this.running = false
    this.ready = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.ackTimer) clearTimeout(this.ackTimer)
    this.socket?.close()
    this.rejectPending(new Error('Connection stopped'))
  }

  async call<Method extends BotMethod>(
    method: Method,
    params: Params<Method>,
  ): Promise<Result<Method>> {
    if (!this.running) void this.start()
    if (!this.ready) {
      await new Promise<void>((resolve) => this.readyWaiters.push(resolve))
    }
    const id = Bun.randomUUIDv7()
    const result = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC ${method} timed out`))
      }, 15_000)
      this.pending.set(id, { method, resolve, reject, timer })
      this.socket?.send(JSON.stringify({ t: 'req', id, method, params }))
    })
    return result as Promise<Result<Method>>
  }

  async uploadFile(chatId: string, file: File) {
    const url = new URL(this.options.url)
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
    url.pathname = '/api/bot/files'
    url.search = ''
    const body = new FormData()
    body.set('chatId', chatId)
    body.set('file', file)
    const response = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.options.token}` },
      body,
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
              : 'BAD_REQUEST'
      throw new BotApiError(code, 'File upload failed')
    }
    if (
      typeof result !== 'object' ||
      result === null ||
      !('fileId' in result) ||
      typeof result.fileId !== 'string'
    ) {
      throw new Error('Invalid file upload response')
    }
    return result.fileId
  }

  private connect() {
    const url = new URL(this.options.url)
    url.searchParams.set('token', this.options.token)
    const socket = new WebSocket(url)
    this.socket = socket
    socket.addEventListener('message', (event) => this.handleMessage(String(event.data)))
    socket.addEventListener('close', () => {
      if (this.socket !== socket) return
      this.ready = false
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

  private handleMessage(frame: string) {
    const json: unknown = JSON.parse(frame)
    const parsed = ServerToBotFrameSchema.safeParse(json)
    if (!parsed.success) return
    const message = parsed.data
    if (message.t === 'hello') {
      this.ready = true
      this.reconnectDelay = 500
      for (const resolve of this.readyWaiters.splice(0)) resolve()
      return
    }
    if (message.t === 'res') {
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      clearTimeout(pending.timer)
      if (message.ok) {
        const result = BotMethods[pending.method].result.parse(message.result)
        pending.resolve(result)
      } else {
        pending.reject(new BotApiError(message.error.code, message.error.message))
      }
      return
    }
    void this.processEvent(message.seq, message.event)
  }

  private async processEvent(seq: number, event: BotEvent) {
    try {
      await this.options.onEvent(event)
      this.queueAcknowledgement(seq)
    } catch (error) {
      if (this.options.ackOnError) this.queueAcknowledgement(seq)
      else throw error
    }
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
    for (const seq of this.acknowledgements) {
      this.socket?.send(JSON.stringify({ t: 'ack', seq }))
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
