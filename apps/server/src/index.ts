import { bootstrapAuth } from './auth/password'
import { createDatabase, type DatabaseContext } from './db/client'
import type { AppEnv } from './env'
import { loadEnv } from './env'
import { createGraphQLHandler } from './graphql'
import { createRouter } from './http/router'
import { type BotWebSocketData, createBotWebSocketHandlers, upgradeBotWebSocket } from './ws/bot-ws'
import { Hub } from './ws/hub'

interface ServerOptions {
  database: DatabaseContext
  env: AppEnv
  port?: number
}

export const startServer = ({ database, env, port = env.PORT }: ServerOptions) => {
  const hub = new Hub()
  const route = createRouter({
    graphql: createGraphQLHandler(database.db, env),
    botWebSocket: (request, server) => upgradeBotWebSocket(request, server, database),
  })
  return Bun.serve<BotWebSocketData>({
    hostname: '0.0.0.0',
    port,
    fetch: (request, server) => route(request, server),
    websocket: {
      ...createBotWebSocketHandlers(database, hub),
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
