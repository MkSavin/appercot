import type { Server } from 'bun'
import type { AppWebSocketData } from '../ws/types'
import { textResponse } from './respond'
import { serveStatic } from './static'

const graphqlBodyLimit = 2 * 1024 ** 2

interface RouterOptions {
  graphql: (request: Request, peer?: string) => Promise<Response>
  botWebSocket: (request: Request, server: Server<AppWebSocketData>) => Response | undefined
  clientWebSocket: (request: Request, server: Server<AppWebSocketData>) => Response | undefined
  uploadUserFile: (request: Request) => Promise<Response>
  uploadBotFile: (request: Request) => Promise<Response>
  mediaLimits: () => Response
  serveFile: (request: Request, fileId: string, thumbnail: boolean) => Promise<Response>
  serveAvatar: (request: Request, botId: string) => Response
  publicDir: string
}

export const createRouter = (options: RouterOptions) => {
  return async (
    request: Request,
    server: Server<AppWebSocketData>,
  ): Promise<Response | undefined> => {
    const pathname = new URL(request.url).pathname
    if (pathname === '/healthz' && request.method === 'GET') return textResponse(200, 'ok')
    if (pathname === '/graphql') {
      const peer = server.requestIP(request)?.address
      if (!request.body) return options.graphql(request, peer)
      if (Number(request.headers.get('content-length')) > graphqlBodyLimit)
        return textResponse(413, 'GraphQL request is too large')
      let size = 0
      const reader = request.body.getReader()
      const chunks: Uint8Array<ArrayBuffer>[] = []
      for (;;) {
        const next = await reader.read()
        if (next.done) break
        size += next.value.byteLength
        if (size > graphqlBodyLimit) {
          void reader.cancel().catch(() => {})
          return textResponse(413, 'GraphQL request is too large')
        }
        chunks.push(next.value)
      }
      return options.graphql(new Request(request, { body: new Blob(chunks) }), peer)
    }
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
    if (pathname === '/api/files/limits' && request.method === 'GET') return options.mediaLimits()
    const file = /^\/api\/files\/([a-zA-Z0-9-]+)(\/thumbnail)?$/.exec(pathname)
    if (file?.[1] && ['GET', 'HEAD'].includes(request.method))
      return options.serveFile(request, file[1], Boolean(file[2]))
    const avatar = /^\/api\/bots\/([a-zA-Z0-9-]+)\/avatar$/.exec(pathname)
    if (avatar?.[1] && request.method === 'GET') return options.serveAvatar(request, avatar[1])
    if (pathname.startsWith('/api/')) return textResponse(404, 'Not found')
    return serveStatic(request, options.publicDir)
  }
}
