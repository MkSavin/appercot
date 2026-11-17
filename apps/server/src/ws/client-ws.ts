import type { Server, WebSocketHandler } from 'bun'
import { getRequestSession } from '../auth/session'
import type { DatabaseContext } from '../db/client'
import type { Hub } from './hub'
import type { AppWebSocketData } from './types'

export const upgradeClientWebSocket = (
  request: Request,
  server: Server<AppWebSocketData>,
  database: DatabaseContext,
) => {
  const session = getRequestSession(database.db, request)
  const upgraded = server.upgrade(request, {
    data: { kind: 'client', userId: session?.user.id ?? null },
  })
  return upgraded ? undefined : new Response('WebSocket upgrade failed', { status: 400 })
}

export const createClientWebSocketHandlers = (hub: Hub): WebSocketHandler<AppWebSocketData> => ({
  open: (socket) => {
    if (socket.data.kind !== 'client') return
    const userId = socket.data.userId
    if (!userId) {
      socket.close(4401, 'unauthorized')
      return
    }
    hub.connectUser(userId, socket)
  },
  message: (socket, frame) => {
    if (socket.data.kind !== 'client') return
    try {
      const value: unknown = JSON.parse(String(frame))
      if (typeof value !== 'object' || value === null || !('t' in value)) return
      if (value.t === 'ping') {
        socket.send(JSON.stringify({ t: 'pong' }))
        return
      }
      if (value.t === 'focus' && 'chatId' in value) {
        const chatId = value.chatId
        if (typeof chatId === 'string' || chatId === null) hub.setFocusedChat(socket, chatId)
      }
    } catch {
      socket.close(4400, 'invalid frame')
    }
  },
  close: (socket) => {
    if (socket.data.kind !== 'client') return
    const userId = socket.data.userId
    if (userId) hub.disconnectUser(userId, socket)
  },
})
