import type { Message } from '@appercot/protocol'

export interface SocketLike {
  send: (data: string) => unknown
  close: (code?: number, reason?: string) => unknown
}

export interface BotConnection {
  socket: SocketLike
  inFlight: Set<number>
  readyForEvents: boolean
}

/** @anchor DOC:server */
export class Hub {
  private readonly botConnections = new Map<string, BotConnection>()
  private readonly userSockets = new Map<string, Set<SocketLike>>()
  private readonly focusedChats = new Map<SocketLike, string | null>()
  private readonly sessionBySocket = new Map<SocketLike, { id: string; expiresAt: number }>()
  private botMessageHandler?: (userId: string, chatId: string, message: Message) => Promise<void>

  connectBot(botId: string, socket: SocketLike, readyForEvents = true) {
    const previous = this.botConnections.get(botId)
    previous?.socket.close(4001, 'replaced')
    const connection: BotConnection = { socket, inFlight: new Set(), readyForEvents }
    this.botConnections.set(botId, connection)
    return { connection, replaced: previous !== undefined }
  }

  disconnectBot(botId: string, socket: SocketLike) {
    const current = this.botConnections.get(botId)
    if (current?.socket !== socket) return false
    this.botConnections.delete(botId)
    return true
  }

  getBotConnection(botId: string) {
    return this.botConnections.get(botId)
  }

  isBotOnline(botId: string) {
    return this.botConnections.has(botId)
  }

  connectUser(userId: string, socket: SocketLike, sessionId?: string, expiresAt = Infinity) {
    const sockets = this.userSockets.get(userId) ?? new Set<SocketLike>()
    sockets.add(socket)
    this.userSockets.set(userId, sockets)
    this.focusedChats.set(socket, null)
    if (sessionId) this.sessionBySocket.set(socket, { id: sessionId, expiresAt })
  }

  disconnectUser(userId: string, socket: SocketLike) {
    const sockets = this.userSockets.get(userId)
    sockets?.delete(socket)
    if (sockets?.size === 0) this.userSockets.delete(userId)
    this.focusedChats.delete(socket)
    this.sessionBySocket.delete(socket)
  }

  disconnectSessions(userId: string, sessionIds: readonly string[]) {
    const revoked = new Set(sessionIds)
    for (const socket of this.userSockets.get(userId) ?? []) {
      const session = this.sessionBySocket.get(socket)
      if (!session || !revoked.has(session.id)) continue
      this.disconnectUser(userId, socket)
      socket.close(4401, 'session revoked')
    }
  }

  setFocusedChat(socket: SocketLike, chatId: string | null) {
    this.focusedChats.set(socket, chatId)
  }

  onBotMessage(handler: (userId: string, chatId: string, message: Message) => Promise<void>) {
    this.botMessageHandler = handler
  }

  notifyBotMessage(userId: string, chatId: string, message: Message) {
    const focused = [...(this.userSockets.get(userId) ?? [])].some(
      (socket) => this.focusedChats.get(socket) === chatId,
    )
    if (!focused && this.botMessageHandler) {
      void this.botMessageHandler(userId, chatId, message).catch(() => {})
    }
  }

  sendToUser(userId: string, frame: unknown) {
    const serialized = JSON.stringify(frame)
    for (const socket of this.userSockets.get(userId) ?? []) {
      if ((this.sessionBySocket.get(socket)?.expiresAt ?? Infinity) <= Date.now()) {
        this.disconnectUser(userId, socket)
        socket.close(4401, 'session expired')
      } else {
        socket.send(serialized)
      }
    }
  }
}
