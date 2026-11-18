import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createServerFixture } from './helpers'

const dataDir = `.test-data/static-${Bun.randomUUIDv7()}`
const publicDir = `${dataDir}/public`

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true })
})

describe('production static files', () => {
  test('serves assets and falls back to the SPA shell for client routes', async () => {
    await mkdir(`${publicDir}/assets`, { recursive: true })
    await writeFile(`${publicDir}/index.html`, '<!doctype html><title>Appercot</title>')
    await writeFile(`${publicDir}/assets/app.js`, 'console.log("appercot")')
    await writeFile(`${publicDir}/sw.js`, 'self.addEventListener("fetch", () => {})')
    const fixture = createServerFixture(dataDir, {}, publicDir)
    try {
      const asset = await fetch(`${fixture.baseUrl}/assets/app.js`)
      expect(asset.status).toBe(200)
      expect(asset.headers.get('content-type')).toContain('javascript')
      expect(asset.headers.get('cache-control')).toContain('immutable')
      expect(await asset.text()).toBe('console.log("appercot")')

      const root = await fetch(`${fixture.baseUrl}/`)
      expect(root.status).toBe(200)
      expect(root.headers.get('cache-control')).toBe('no-cache')
      expect(await root.text()).toContain('<title>Appercot</title>')

      const clientRoute = await fetch(`${fixture.baseUrl}/c/01abcdefghijklmnopqr`)
      expect(clientRoute.status).toBe(200)
      expect(await clientRoute.text()).toContain('<title>Appercot</title>')

      const serviceWorker = await fetch(`${fixture.baseUrl}/sw.js`)
      expect(serviceWorker.headers.get('cache-control')).toBe('no-cache')
      expect(serviceWorker.headers.get('service-worker-allowed')).toBe('/')

      const head = await fetch(`${fixture.baseUrl}/assets/app.js`, { method: 'HEAD' })
      expect(head.status).toBe(200)
      expect(await head.text()).toBe('')

      expect((await fetch(`${fixture.baseUrl}/api/unknown`)).status).toBe(404)
      expect((await fetch(`${fixture.baseUrl}/assets/app.js`, { method: 'POST' })).status).toBe(404)
    } finally {
      fixture.stop()
    }
  })
})
