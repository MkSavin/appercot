import {
  type ClientToServerFrame,
  type ClientUpdateFrame,
  ServerToClientFrameSchema,
} from '@appercot/protocol'
import type { ConnectionStatus } from '@/shared/model'

interface ClientTransportOptions {
  url?: string
  socketFactory?: (url: string) => WebSocket
  heartbeatIntervalMs?: number
  reconnectDelayMs?: number
  random?: () => number
  onUpdate: (frame: ClientUpdateFrame) => void
  onReady?: () => void
  onConnection?: (status: ConnectionStatus) => void
}

const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/ws`
}

export const createClientWebSocketTransport = (options: ClientTransportOptions) => {
  const socketFactory = options.socketFactory ?? ((url: string) => new WebSocket(url))
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15_000
  const initialReconnectDelayMs = options.reconnectDelayMs ?? 500
  const random = options.random ?? Math.random
  let socket: WebSocket | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let reconnectAttempt = 0
  let focusedChatId: string | null = null

  const clearHeartbeat = () => {
    if (heartbeatTimer !== null) clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }

  const send = (frame: ClientToServerFrame) => {
    if (socket?.readyState !== 1) return
    socket.send(JSON.stringify(frame))
  }

  const sendHeartbeat = () => {
    if (!running || socket?.readyState !== 1) return
    send({ t: 'ping' })
    heartbeatTimer = setTimeout(() => socket?.close(4000, 'Heartbeat timeout'), heartbeatIntervalMs)
  }

  const scheduleHeartbeat = () => {
    clearHeartbeat()
    heartbeatTimer = setTimeout(sendHeartbeat, heartbeatIntervalMs)
  }

  const scheduleReconnect = () => {
    if (!running || reconnectTimer !== null) return
    const delay = Math.min(30_000, initialReconnectDelayMs * 2 ** reconnectAttempt)
    reconnectAttempt += 1
    const jitter = delay * (0.8 + random() * 0.4)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, jitter)
  }

  const connect = () => {
    if (!running) return
    options.onConnection?.('connecting')
    const connectedSocket = socketFactory(options.url ?? getWebSocketUrl())
    socket = connectedSocket

    connectedSocket.addEventListener('open', () => {
      if (socket !== connectedSocket || !running) return
      reconnectAttempt = 0
      options.onConnection?.('online')
      send({ t: 'focus', chatId: focusedChatId })
      scheduleHeartbeat()
      options.onReady?.()
    })

    connectedSocket.addEventListener('message', (event) => {
      if (socket !== connectedSocket || !running) return
      try {
        const frame = ServerToClientFrameSchema.parse(JSON.parse(String(event.data)))
        if (frame.t === 'pong') {
          scheduleHeartbeat()
          options.onConnection?.('online')
        } else {
          options.onUpdate(frame)
        }
      } catch {
        return
      }
    })

    connectedSocket.addEventListener('close', () => {
      if (socket !== connectedSocket) return
      socket = null
      clearHeartbeat()
      options.onConnection?.('offline')
      scheduleReconnect()
    })

    connectedSocket.addEventListener('error', () => {
      if (socket === connectedSocket) options.onConnection?.('offline')
    })
  }

  return {
    start: () => {
      if (running) return
      running = true
      connect()
    },
    stop: () => {
      running = false
      if (reconnectTimer !== null) clearTimeout(reconnectTimer)
      reconnectTimer = null
      clearHeartbeat()
      const currentSocket = socket
      socket = null
      currentSocket?.close(1000, 'Client stopped')
      options.onConnection?.('offline')
    },
    setFocus: (chatId: string | null) => {
      focusedChatId = chatId
      send({ t: 'focus', chatId })
    },
  }
}

export type ClientWebSocketTransport = ReturnType<typeof createClientWebSocketTransport>
