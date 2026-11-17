import type { Server } from 'bun'
import type { AppWebSocketData } from '../ws/types'
import { textResponse } from './respond'

interface RouterOptions {
  graphql: (request: Request) => Promise<Response>
  botWebSocket: (request: Request, server: Server<AppWebSocketData>) => Response | undefined
  clientWebSocket: (request: Request, server: Server<AppWebSocketData>) => Response | undefined
}

export const createRouter = (options: RouterOptions) => {
  return async (
    request: Request,
    server: Server<AppWebSocketData>,
  ): Promise<Response | undefined> => {
    const pathname = new URL(request.url).pathname
    if (pathname === '/healthz' && request.method === 'GET') return textResponse(200, 'ok')
    if (pathname === '/graphql') return options.graphql(request)
    if (pathname === '/api/bot/ws' && request.method === 'GET') {
      return options.botWebSocket(request, server)
    }
    if (pathname === '/api/ws' && request.method === 'GET') {
      return options.clientWebSocket(request, server)
    }
    return textResponse(404, 'Not found')
  }
}
