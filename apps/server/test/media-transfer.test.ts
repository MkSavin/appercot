import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBot } from '../../../packages/chat/src'
import { createMediaStorage } from '../src/domain/media-storage'
import { loadEnv } from '../src/env'
import { garageTestConfig } from './garage-config'
import { createServerFixture, graphqlRequest } from './helpers'

const sourceMedia = async () => {
  const ffmpeg = Bun.which('ffmpeg')
  if (!ffmpeg) return { bytes: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]), ffmpeg }
  const output = Bun.spawn(
    [
      ffmpeg,
      '-nostdin',
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=red:s=160x90:d=1',
      '-c:v',
      'mpeg4',
      '-threads',
      '1',
      '-movflags',
      'frag_keyframe+empty_moov',
      '-f',
      'mp4',
      'pipe:1',
    ],
    { stdout: 'pipe', stderr: 'ignore' },
  )
  const bytes = await new Response(output.stdout).bytes()
  if ((await output.exited) || !bytes.length) throw new Error('Could not generate video fixture')
  return { bytes, ffmpeg }
}

const roundTrip = async (storage: Record<string, string> = {}) => {
  const { bytes, ffmpeg } = await sourceMedia()
  const dataDir = await mkdtemp(join(tmpdir(), 'appercot-media-'))
  const remote = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      if (new URL(request.url).pathname === '/redirect')
        return Response.redirect('http://127.0.0.2/clip.mp4')
      return new Response(bytes, { headers: { 'content-type': 'video/mp4' } })
    },
  })
  const fixture = createServerFixture(dataDir, {
    MEDIA_MAX_BYTES: String(bytes.length + 10),
    MEDIA_TRUSTED_HOSTS: `127.0.0.1:${remote.port}`,
    ...storage,
  })
  let sdk: ReturnType<typeof createBot> | undefined
  try {
    const login = await graphqlRequest(
      fixture.baseUrl,
      'mutation { login(username: "admin", password: "password123") { user { id } } }',
    )
    const cookie = login.response.headers.get('set-cookie') ?? ''
    const call = (query: string) => graphqlRequest(fixture.baseUrl, query, {}, cookie)
    const created = await call(
      'mutation { createBot(username: "mediabot", name: "Media", description: "") { token } }',
    )
    const { token } = created.body.data.createBot as { token: string }
    const joined = await call('mutation { addBot(username: "mediabot") { id } }')
    const { id: chatId } = joined.body.data.addBot as { id: string }
    const wsUrl = new URL('/api/bot/ws', fixture.baseUrl)
    wsUrl.protocol = 'ws:'
    sdk = createBot({ url: wsUrl.href, token })
    await sdk.start()
    const remoteUrl = new URL('/clip.mp4', remote.url)
    const imported = await sdk.api.sendFile(chatId, remoteUrl, { caption: 'From URL' })
    const uploaded = await sdk.api.sendFile(chatId, bytes, { name: 'clip.mp4' })
    expect(imported.content.media?.[0]?.kind).toBe('video')
    expect(uploaded.content.media?.[0]?.kind).toBe('video')
    const ids = [imported, uploaded].map((message) => message.content.media?.[0]?.fileId)
    for (const id of ids) {
      const url = `${fixture.baseUrl}/api/files/${id}`
      const range = await fetch(url, { headers: { cookie, range: 'bytes=2-5' } })
      expect(range.status).toBe(206)
      expect(await range.bytes()).toEqual(bytes.slice(2, 6))
      expect(
        (await fetch(url, { method: 'HEAD', headers: { cookie } })).headers.get('content-length'),
      ).toBe(String(bytes.length))
      if (ffmpeg) {
        const thumb = `${url}/thumbnail`
        let preview = await fetch(thumb, { headers: { cookie } })
        for (let i = 0; preview.status === 202 && i < 100; i++) {
          await Bun.sleep(45)
          preview = await fetch(thumb, { headers: { cookie } })
        }
        expect(preview.status).toBe(200)
        expect(preview.headers.get('content-type')).toBe('image/jpeg')
        expect((await preview.bytes()).slice(0, 2)).toEqual(new Uint8Array([0xff, 0xd8]))
        const etag = preview.headers.get('etag') ?? ''
        expect((await fetch(thumb, { headers: { cookie, 'if-none-match': etag } })).status).toBe(
          304,
        )
        expect((await fetch(thumb, { headers: { 'if-none-match': etag } })).status).toBe(401)
      }
    }
    await expect(sdk.uploadFile(chatId, new URL('/redirect', remote.url))).rejects.toThrow('(403)')
    const tooLarge = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(bytes.length + 11))
        controller.close()
      },
    })
    await expect(sdk.uploadFile(chatId, tooLarge, { name: 'over.bin' })).rejects.toThrow(
      'File is too large',
    )
  } finally {
    sdk?.stop()
    fixture.stop()
    await remote.stop()
    await rm(dataDir, { recursive: true, force: true })
  }
}

// @anchor INV:media-transfer/imports-streams
test(
  'imports both sources as playable attachments, limits streamed data, and caches protected previews',
  () => roundTrip(),
  20_000,
)

const endpoint = process.env.APPERCOT_TEST_S3_ENDPOINT
const garage = {
  ...garageTestConfig,
  S3_ENDPOINT: endpoint,
}
test.skipIf(!endpoint)(
  'performs the same media round trip with Garage',
  async () => {
    if (!endpoint) return
    await roundTrip({ ...garage, S3_ENDPOINT: endpoint })
  },
  25_000,
)

test.skipIf(!endpoint)(
  'streams multiple S3 parts and reads across a part boundary',
  async () => {
    const storage = createMediaStorage(loadEnv(garage))
    const id = Bun.randomUUIDv7()
    const chunkSize = 1024 * 1024
    let index = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index === 17) {
          controller.close()
          return
        }
        controller.enqueue(new Uint8Array(chunkSize).fill(index++))
      },
    })
    try {
      await storage.write('s3', id, body, 'application/octet-stream')
      const object = storage.blob('s3', id)
      const boundary = 16 * chunkSize
      const expectedBoundaryBytes = new Uint8Array([15, 15, 16, 16])
      const signed = await fetch(storage.source('s3', id), {
        headers: { range: `bytes=${boundary - 2}-${boundary + 1}` },
      })
      expect(signed.status).toBe(206)
      expect(await signed.bytes()).toEqual(expectedBoundaryBytes)
      const bytes = await new Response(object.slice(boundary - 2, boundary + 2).stream()).bytes()
      expect(bytes).toEqual(expectedBoundaryBytes)
    } finally {
      await storage.remove('s3', id)
    }
  },
  25_000,
)
