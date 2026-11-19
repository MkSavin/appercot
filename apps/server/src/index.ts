import { resolve } from 'node:path'
import { bootstrapAuth } from './auth/password'
import { getRequestSession } from './auth/session'
import { createDatabase, type DatabaseContext } from './db/client'
import { getAvatarForUser } from './domain/bot-profile'
import { CallbackRegistry } from './domain/callbacks'
import { S3_MAX_BYTES } from './domain/files'
import { createMediaStorage } from './domain/media-storage'
import { resetUserMessageRateLimits } from './domain/messages'
import { startPruneJob } from './domain/prune'
import { PushService } from './domain/push'
import type { AppEnv } from './env'
import { loadEnv } from './env'
import { createGraphQLHandler } from './graphql'
import { createFileHandlers } from './http/files'
import { createRouter } from './http/router'
import { resolveRuntimeDirectory } from './runtime'
import { OperationBarrier } from './test/barrier'
import { loadServerConfig } from './test/config'
import { assertProductionDataDirectory } from './test/environment'
import { TestFixtureError } from './test/errors'
import { createBotWebSocketHandlers, upgradeBotWebSocket } from './ws/bot-ws'
import { createClientWebSocketHandlers, upgradeClientWebSocket } from './ws/client-ws'
import { Hub } from './ws/hub'
import type { AppWebSocketData } from './ws/types'

interface ServerOptions {
  database: DatabaseContext
  env: AppEnv
  port?: number
  hostname?: string
  publicDir?: string
  testControl?: (request: Request) => Promise<Response>
  barrier?: OperationBarrier
  mediaStoragePrefix?: string
  hub?: Hub
}

export const startServer = ({
  database,
  env,
  port = env.PORT,
  hostname = '0.0.0.0',
  publicDir = resolve(resolveRuntimeDirectory(), 'public'),
  testControl,
  barrier = new OperationBarrier(),
  mediaStoragePrefix,
  hub = new Hub(),
}: ServerOptions) => {
  const callbacks = new CallbackRegistry()
  barrier.onBeforeDrain(() => callbacks.cancelAll())
  barrier.onAfterReset(() => resetUserMessageRateLimits())
  const push = new PushService(database.db, env)
  hub.onBotMessage((userId, chatId, message) => push.sendMessage(userId, chatId, message))
  const botHandlers = createBotWebSocketHandlers(database, hub, callbacks, barrier)
  const clientHandlers = createClientWebSocketHandlers(hub)
  const mediaStorage = createMediaStorage(env, mediaStoragePrefix)
  const fileHandlers = createFileHandlers(database.db, env, mediaStorage)
  barrier.onBeforeDrain(() => fileHandlers.pausePreviews())
  barrier.onAfterReset(() => fileHandlers.resumePreviews())
  const route = createRouter({
    graphql: createGraphQLHandler(database.db, env, hub, callbacks, push),
    botWebSocket: (request, server) => upgradeBotWebSocket(request, server, database),
    clientWebSocket: (request, server) => upgradeClientWebSocket(request, server, database),
    uploadUserFile: fileHandlers.uploadUser,
    uploadBotFile: fileHandlers.uploadBot,
    serveFile: fileHandlers.serve,
    mediaLimits: fileHandlers.limits,
    serveAvatar: (request, botId) => {
      const session = getRequestSession(database.db, request)
      const avatar = getAvatarForUser(database.db, session?.user ?? null, botId)
      if (!avatar) return new Response(null, { status: 404 })
      return new Response(new Uint8Array(avatar.bytes), {
        headers: {
          'content-type': avatar.mime,
          'cache-control': 'private, no-store',
          'x-content-type-options': 'nosniff',
        },
      })
    },
    publicDir,
    testControl,
  })
  const prune = startPruneJob(database.db, mediaStorage)
  barrier.onBeforeDrain(() => prune.pause())
  barrier.onAfterReset(() => prune.resume())
  return Bun.serve<AppWebSocketData>({
    hostname,
    port,
    maxRequestBodySize: S3_MAX_BYTES,
    idleTimeout: 120,
    fetch: async (request, server) => {
      const pathname = new URL(request.url).pathname
      const stateOperation = pathname === '/graphql' || pathname.startsWith('/api/')
      let response: Response | undefined
      try {
        response = stateOperation
          ? await barrier.run((signal) =>
              route(
                pathname === '/api/ws' || pathname === '/api/bot/ws'
                  ? request
                  : new Request(request, { signal }),
                server,
              ),
            )
          : await route(request, server)
      } catch (error) {
        if (error instanceof TestFixtureError && error.code === 'TEST_RESET_IN_PROGRESS') {
          response = Response.json(
            { error: { code: error.code, message: error.message } },
            { status: 503, headers: { 'cache-control': 'no-store' } },
          )
        } else throw error
      }
      response?.headers.set(
        'content-security-policy',
        "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      )
      return response
    },
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
  const loaded = process.env.APPERCOT_CONFIG
    ? await loadServerConfig(process.env.APPERCOT_CONFIG)
    : { env: loadEnv(), hostname: '0.0.0.0', publicDir: undefined }
  assertProductionDataDirectory(loaded.env.DATA_DIR)
  const database = createDatabase(`${loaded.env.DATA_DIR}/appercot.sqlite`)
  bootstrapAuth(database.db, loaded.env)
  const server = startServer({
    database,
    env: loaded.env,
    hostname: loaded.hostname,
    publicDir: loaded.publicDir,
  })
  console.log(`Appercot server listening on ${server.url}`)
}
