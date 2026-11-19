import { describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'
import { createBot } from '../../../packages/chat/src'
import { createServerFixture, graphqlRequest } from './helpers'

const upload = async (
  baseUrl: string,
  path: string,
  file: File,
  chatId: string,
  auth: { cookie?: string; token?: string },
) => {
  const body = new FormData()
  body.set('chatId', chatId)
  body.set('file', file)
  const headers = new Headers()
  if (auth.cookie) headers.set('cookie', auth.cookie)
  if (auth.token) headers.set('authorization', `Bearer ${auth.token}`)
  return fetch(`${baseUrl}${path}`, { method: 'POST', headers, body })
}

describe('file uploads and media delivery', () => {
  // @anchor INV:files/protects-access
  test('uploads user and bot media, protects access and supports byte ranges', async () => {
    const dataDir = `.test-data/files-${Bun.randomUUIDv7()}`
    const fixture = createServerFixture(dataDir)
    let sdk: ReturnType<typeof createBot> | undefined
    try {
      const login = await graphqlRequest(
        fixture.baseUrl,
        'mutation { login(username: "admin", password: "password123") { user { id } } }',
      )
      const adminCookie = login.response.headers.get('set-cookie')
      if (!adminCookie) throw new Error('Admin cookie is missing')
      const registration = await graphqlRequest(
        fixture.baseUrl,
        'mutation { register(username: "outsider", password: "password123", displayName: "Outsider", invite: "bootstrap-invite") { user { id } } }',
      )
      const outsiderCookie = registration.response.headers.get('set-cookie')
      if (!outsiderCookie) throw new Error('Outsider cookie is missing')
      const created = await graphqlRequest(
        fixture.baseUrl,
        'mutation { createBot(username: "filesbot", name: "Files", description: "Files") { token bot { id } } }',
        {},
        adminCookie,
      )
      const token = (created.body.data.createBot as { token: string }).token
      const added = await graphqlRequest(
        fixture.baseUrl,
        'mutation { addBot(username: "filesbot") { id } }',
        {},
        adminCookie,
      )
      const chatId = (added.body.data.addBot as { id: string }).id

      const imageUpload = await upload(
        fixture.baseUrl,
        '/api/files',
        new File([new Uint8Array([1, 2, 3, 4, 5, 6])], 'pixel.png', { type: 'image/png' }),
        chatId,
        { cookie: adminCookie },
      )
      expect(imageUpload.status).toBe(201)
      const imageBody = (await imageUpload.json()) as { fileId: string }
      expect(imageBody.fileId).toBeString()

      const image = await fetch(`${fixture.baseUrl}/api/files/${imageBody.fileId}`, {
        headers: { cookie: adminCookie },
      })
      expect(image.status).toBe(200)
      expect(image.headers.get('content-type')).toBe('image/png')
      expect(image.headers.get('cache-control')).toBe('private, no-store')
      expect(await image.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]).buffer)

      const forbidden = await fetch(`${fixture.baseUrl}/api/files/${imageBody.fileId}`, {
        headers: { cookie: outsiderCookie },
      })
      expect(forbidden.status).toBe(403)
      expect((await fetch(`${fixture.baseUrl}/api/files/${imageBody.fileId}`)).status).toBe(401)

      sdk = createBot({
        url: `${fixture.baseUrl.replace('http:', 'ws:')}/api/bot/ws`,
        token,
      })
      const videoId = await sdk.uploadFile(
        chatId,
        new File([new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])], 'clip.mp4', {
          type: 'video/mp4',
        }),
      )
      expect(videoId).toBeString()
      const range = await fetch(`${fixture.baseUrl}/api/files/${videoId}`, {
        headers: { cookie: adminCookie, range: 'bytes=2-5' },
      })
      expect(range.status).toBe(206)
      expect(range.headers.get('content-range')).toBe('bytes 2-5/8')
      expect(range.headers.get('accept-ranges')).toBe('bytes')
      expect(await range.arrayBuffer()).toEqual(new Uint8Array([2, 3, 4, 5]).buffer)

      const suffix = await fetch(`${fixture.baseUrl}/api/files/${videoId}`, {
        headers: { cookie: adminCookie, range: 'bytes=-2' },
      })
      expect(suffix.status).toBe(206)
      expect(await suffix.arrayBuffer()).toEqual(new Uint8Array([6, 7]).buffer)
      const invalidRange = await fetch(`${fixture.baseUrl}/api/files/${videoId}`, {
        headers: { cookie: adminCookie, range: 'bytes=20-' },
      })
      expect(invalidRange.status).toBe(416)
      expect(invalidRange.headers.get('content-range')).toBe('bytes */8')

      const botImageId = await sdk.uploadFile(
        chatId,
        new File([new Uint8Array([9, 8, 7])], 'bot-image.png', { type: 'image/png' }),
      )
      await sdk.api.sendMessage({
        chatId,
        content: {
          media: [
            { fileId: botImageId, kind: 'image' },
            { fileId: videoId, kind: 'video' },
          ],
        },
      })
      const userMediaMessage = await graphqlRequest(
        fixture.baseUrl,
        'mutation($input: SendMessageInput!) { sendMessage(input: $input) { content } }',
        {
          input: {
            chatId,
            clientId: 'image-message',
            content: { media: [{ fileId: imageBody.fileId, kind: 'image' }] },
          },
        },
        adminCookie,
      )
      expect(userMediaMessage.body.errors).toBeUndefined()
      const history = await graphqlRequest(
        fixture.baseUrl,
        'query($chatId: ID!) { messages(chatId: $chatId) { sender content } }',
        { chatId },
        adminCookie,
      )
      expect(history.body.data.messages).toContainEqual({
        sender: 'bot',
        content: {
          media: [
            { fileId: botImageId, kind: 'image' },
            { fileId: videoId, kind: 'video' },
          ],
        },
      })
      expect(history.body.data.messages).toContainEqual({
        sender: 'user',
        content: { media: [{ fileId: imageBody.fileId, kind: 'image' }] },
      })

      const svg = await upload(
        fixture.baseUrl,
        '/api/files',
        new File(['<svg></svg>'], 'vector.svg', { type: 'image/svg+xml' }),
        chatId,
        { cookie: adminCookie },
      )
      expect(svg.status).toBe(415)
    } finally {
      sdk?.stop()
      fixture.stop()
      await rm(dataDir, { recursive: true, force: true })
    }
  })
})
