import { bootstrapAuth } from './auth/password'
import { createDatabase, type DatabaseContext } from './db/client'
import { CallbackRegistry } from './domain/callbacks'
import { startPruneJob } from './domain/prune'
import type { AppEnv } from './env'
import { loadEnv } from './env'
import { createGraphQLHandler } from './graphql'
import { createRouter } from './http/router'
import { createBotWebSocketHandlers, upgradeBotWebSocket } from './ws/bot-ws'
import { createClientWebSocketHandlers, upgradeClientWebSocket } from './ws/client-ws'
import { Hub } from './ws/hub'
import type { AppWebSocketData } from './ws/types'

interface ServerOptions {
  database: DatabaseContext
  env: AppEnv
  port?: number
}

export const startServer = ({ database, env, port = env.PORT }: ServerOptions) => {
  const hub = new Hub()
  const callbacks = new CallbackRegistry()
  const botHandlers = createBotWebSocketHandlers(database, hub, callbacks)
  const clientHandlers = createClientWebSocketHandlers(hub)
  const route = createRouter({
    graphql: createGraphQLHandler(database.db, env, hub, callbacks),
    botWebSocket: (request, server) => upgradeBotWebSocket(request, server, database),
    clientWebSocket: (request, server) => upgradeClientWebSocket(request, server, database),
  })
  startPruneJob(database.db)
  return Bun.serve<AppWebSocketData>({
    hostname: '0.0.0.0',
    port,
    fetch: (request, server) => route(request, server),
    websocket: {
      open: (socket) => {
        if (socket.data.kind === 'bot') botHandlers.open?.(socket)
        else clientHandlers.open?.(socket)
      },
      message: (socket, frame) => {
        if (socket.data.kind === 'bot') botHandlers.message?.(socket, frame)
        else clientHandlers.message?.(socket, frame)
      },
      close: (socket, code, reason) => {
        if (socket.data.kind === 'bot') botHandlers.close?.(socket, code, reason)
        else clientHandlers.close?.(socket, code, reason)
      },
      idleTimeout: 60,
      sendPings: true,
      maxPayloadLength: 16 * 1024 * 1024,
    },
  })
}

if (import.meta.main) {
  const env = loadEnv()
  const database = createDatabase(`${env.DATA_DIR}/appercot.sqlite`)
  bootstrapAuth(database.db, env)
  const server = startServer({ database, env })
  console.log(`Appercot server listening on ${server.url}`)
}
