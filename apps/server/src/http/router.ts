import type { Server } from 'bun'
import type { BotWebSocketData } from '../ws/bot-ws'
import { textResponse } from './respond'

interface RouterOptions {
  graphql: (request: Request) => Promise<Response>
  botWebSocket: (request: Request, server: Server<BotWebSocketData>) => Response | undefined
}

export const createRouter = (options: RouterOptions) => {
  return async (
    request: Request,
    server: Server<BotWebSocketData>,
  ): Promise<Response | undefined> => {
    const pathname = new URL(request.url).pathname
    if (pathname === '/healthz' && request.method === 'GET') return textResponse(200, 'ok')
    if (pathname === '/graphql') return options.graphql(request)
    if (pathname === '/api/bot/ws' && request.method === 'GET') {
      return options.botWebSocket(request, server)
    }
    return textResponse(404, 'Not found')
  }
}
