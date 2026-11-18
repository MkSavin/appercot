import { resolve, sep } from 'node:path'
import { textResponse } from './respond'

const withinPublicDirectory = (publicDir: string, filePath: string) =>
  filePath === publicDir || filePath.startsWith(`${publicDir}${sep}`)

export const serveStatic = async (request: Request, publicDir: string): Promise<Response> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return textResponse(404, 'Not found')
  }
  const root = resolve(publicDir)
  let pathname: string
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname)
  } catch {
    return textResponse(400, 'Invalid path')
  }
  const filePath = resolve(root, `.${pathname}`)
  if (!withinPublicDirectory(root, filePath)) return textResponse(404, 'Not found')

  const file = Bun.file(filePath)
  const serveFile = async () => {
    if (!(await file.exists())) return null
    const immutable = pathname.startsWith('/assets/')
    const serviceWorker = pathname === '/sw.js'
    const headers = new Headers({
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
    })
    if (serviceWorker) {
      headers.set('cache-control', 'no-cache')
      headers.set('service-worker-allowed', '/')
    }
    return new Response(file, { headers })
  }
  const response = await serveFile()
  if (response) return response

  const shell = Bun.file(resolve(root, 'index.html'))
  if (!(await shell.exists())) return textResponse(404, 'Not found')
  return new Response(shell, {
    headers: { 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' },
  })
}
