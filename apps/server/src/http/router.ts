import type { Server } from 'bun'
import type { AppWebSocketData } from '../ws/types'
import { textResponse } from './respond'
import { serveStatic } from './static'

interface RouterOptions {
  graphql: (request: Request) => Promise<Response>
  botWebSocket: (request: Request, server: Server<AppWebSocketData>) => Response | undefined
  clientWebSocket: (request: Request, server: Server<AppWebSocketData>) => Response | undefined
  uploadUserFile: (request: Request) => Promise<Response>
  uploadBotFile: (request: Request) => Promise<Response>
  serveFile: (request: Request, fileId: string) => Response
  publicDir: string
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
    if (pathname === '/api/files' && request.method === 'POST') {
      return options.uploadUserFile(request)
    }
    if (pathname === '/api/bot/files' && request.method === 'POST') {
      return options.uploadBotFile(request)
    }
    if (pathname.startsWith('/api/files/') && request.method === 'GET') {
      return options.serveFile(request, pathname.slice('/api/files/'.length))
    }
    if (pathname.startsWith('/api/')) return textResponse(404, 'Not found')
    return serveStatic(request, options.publicDir)
  }
}
