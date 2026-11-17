export interface SocketLike {
  send: (data: string) => unknown
  close: (code?: number, reason?: string) => unknown
}

export interface BotConnection {
  socket: SocketLike
  inFlight: Set<number>
}

export class Hub {
  private readonly botConnections = new Map<string, BotConnection>()
  private readonly userSockets = new Map<string, Set<SocketLike>>()
  private readonly focusedChats = new Map<SocketLike, string | null>()

  connectBot(botId: string, socket: SocketLike) {
    const previous = this.botConnections.get(botId)
    previous?.socket.close(4001, 'replaced')
    const connection: BotConnection = { socket, inFlight: new Set() }
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

  connectUser(userId: string, socket: SocketLike) {
    const sockets = this.userSockets.get(userId) ?? new Set<SocketLike>()
    sockets.add(socket)
    this.userSockets.set(userId, sockets)
    this.focusedChats.set(socket, null)
  }

  disconnectUser(userId: string, socket: SocketLike) {
    const sockets = this.userSockets.get(userId)
    sockets?.delete(socket)
    if (sockets?.size === 0) this.userSockets.delete(userId)
    this.focusedChats.delete(socket)
  }

  setFocusedChat(socket: SocketLike, chatId: string | null) {
    this.focusedChats.set(socket, chatId)
  }

  sendToUser(userId: string, frame: unknown) {
    const serialized = JSON.stringify(frame)
    for (const socket of this.userSockets.get(userId) ?? []) socket.send(serialized)
  }
}
