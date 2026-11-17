import type { BotRequestFrame } from '@appercot/protocol'
import type { Server, WebSocketHandler } from 'bun'
import { asc, eq } from 'drizzle-orm'
import { authenticateBotToken } from '../auth/bot-token'
import type { DatabaseContext } from '../db/client'
import { botCommands } from '../db/schema'
import type { CallbackRegistry } from '../domain/callbacks'
import { getChatForBot } from '../domain/chats'
import { setBotCommands } from '../domain/commands'
import { DomainError } from '../domain/errors'
import { acknowledgeBotEvent, flushBotEvents } from '../domain/events'
import { kvClear, kvGet, kvSet } from '../domain/kv'
import { deleteBotMessage, editBotMessage, sendBotMessage } from '../domain/messages'
import { RateLimiter } from '../domain/rate-limit'
import { getBotRef, setBotRoles, setChatRoles } from '../domain/roles'
import { publishBotPresence, pushUserUpdate } from '../domain/updates'
import { getFrameRequestId, parseBotFrame } from './frames'
import type { Hub } from './hub'
import type { AppWebSocketData } from './types'

export type BotWebSocketData = AppWebSocketData

const getToken = (request: Request) => {
  const authorization = request.headers.get('authorization')
  if (authorization?.startsWith('Bearer ')) return authorization.slice('Bearer '.length)
  return new URL(request.url).searchParams.get('token')
}

export const upgradeBotWebSocket = (
  request: Request,
  server: Server<AppWebSocketData>,
  database: DatabaseContext,
) => {
  const token = getToken(request)
  const bot = token ? authenticateBotToken(database.db, token) : null
  const upgraded = server.upgrade(request, {
    data: { kind: 'bot', botId: bot?.id ?? null },
  })
  return upgraded ? undefined : new Response('WebSocket upgrade failed', { status: 400 })
}

export const createBotWebSocketHandlers = (
  database: DatabaseContext,
  hub: Hub,
  callbacks: CallbackRegistry,
): WebSocketHandler<AppWebSocketData> => {
  const rateLimiter = new RateLimiter(30, 1000)
  const dispatch = async (botId: string, request: BotRequestFrame) => {
    switch (request.method) {
      case 'getMe':
        return getBotRef(database.db, hub, botId)
      case 'setCommands':
        return setBotCommands(database.db, botId, request.params)
      case 'setRoles':
        return setBotRoles(database.db, botId, request.params)
      case 'sendMessage':
        return sendBotMessage(database.db, hub, botId, request.params)
      case 'editMessage':
        return editBotMessage(database.db, hub, botId, request.params)
      case 'deleteMessage':
        return deleteBotMessage(database.db, hub, botId, request.params)
      case 'answerCallback':
        return callbacks.answer(request.params.callbackId, botId, request.params.toast)
      case 'sendTyping': {
        const { chat } = getChatForBot(database.db, request.params.chatId, botId)
        pushUserUpdate(database.db, hub, chat.userId, {
          type: 'bot.typing',
          chatId: request.params.chatId,
        })
        return { ok: true } as const
      }
      case 'setChatRoles':
        return setChatRoles(database.db, hub, botId, request.params)
      case 'kvGet':
        return kvGet(database.db, botId, request.params)
      case 'kvSet':
        return kvSet(database.db, botId, request.params)
      case 'kvClear':
        return kvClear(database.db, botId, request.params)
    }
  }

  const handleMessage = async (
    socket: Parameters<NonNullable<WebSocketHandler<AppWebSocketData>['message']>>[0],
    frame: string,
  ) => {
    if (socket.data.kind !== 'bot') return
    const botId = socket.data.botId
    if (!botId) return
    const parsed = parseBotFrame(frame)
    if (!parsed.success) {
      const requestId = getFrameRequestId(frame)
      if (requestId) {
        socket.send(
          JSON.stringify({
            t: 'res',
            id: requestId,
            ok: false,
            error: { code: 'BAD_REQUEST', message: 'Invalid frame' },
          }),
        )
      }
      return
    }
    if (parsed.data.t === 'ack') {
      acknowledgeBotEvent(database.db, hub, botId, parsed.data.seq)
      return
    }
    try {
      if (!rateLimiter.allow(botId)) throw new DomainError('RATE_LIMIT', 'Too many requests')
      const result = await dispatch(botId, parsed.data)
      socket.send(JSON.stringify({ t: 'res', id: parsed.data.id, ok: true, result }))
    } catch (error) {
      const domainError =
        error instanceof DomainError ? error : new DomainError('INTERNAL', 'Internal server error')
      socket.send(
        JSON.stringify({
          t: 'res',
          id: parsed.data.id,
          ok: false,
          error: { code: domainError.code, message: domainError.message },
        }),
      )
    }
  }

  return {
    open: (socket) => {
      if (socket.data.kind !== 'bot') return
      const botId = socket.data.botId
      if (!botId) {
        socket.close(4401, 'unauthorized')
        return
      }
      const { replaced } = hub.connectBot(botId, socket)
      if (!replaced) publishBotPresence(database.db, hub, botId, true)
      const commands = database.db
        .select()
        .from(botCommands)
        .where(eq(botCommands.botId, botId))
        .orderBy(asc(botCommands.sort))
        .all()
      socket.send(
        JSON.stringify({
          t: 'hello',
          protocol: 1,
          bot: getBotRef(database.db, hub, botId),
          commands: commands.map((command) => ({
            name: command.name,
            description: command.description,
            roles: command.roles ?? undefined,
          })),
        }),
      )
      flushBotEvents(database.db, hub, botId)
    },
    message: (socket, frame) => {
      void handleMessage(socket, String(frame))
    },
    close: (socket) => {
      if (socket.data.kind !== 'bot') return
      const botId = socket.data.botId
      if (botId && hub.disconnectBot(botId, socket)) {
        publishBotPresence(database.db, hub, botId, false)
      }
    },
  }
}
