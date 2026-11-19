import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { S3Client } from 'bun'
import type { AppEnv } from '../env'

export type StorageKind = 'local' | 's3'

export const createMediaStorage = (env: AppEnv, environmentPrefix = '') => {
  const directory = join(env.DATA_DIR, 'files')
  const s3 = env.S3_ENDPOINT
    ? new S3Client({
        endpoint: env.S3_ENDPOINT,
        bucket: env.S3_BUCKET,
        region: env.S3_REGION,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        virtualHostedStyle: false,
        partSize: 8 * 1024 * 1024,
        queueSize: 2,
        retry: 2,
      })
    : undefined
  const key = (id: string, preview = false) =>
    `files/${environmentPrefix}${id}${preview ? '.jpg' : ''}`
  const blob = (kind: StorageKind, id: string, preview = false) => {
    const objectKey = key(id, preview)
    if (kind === 'local') return Bun.file(join(directory, `${id}${preview ? '.jpg' : ''}`))
    if (!s3) throw new Error('S3 storage is not configured')
    return s3.file(objectKey)
  }
  return {
    kind: s3 ? ('s3' as const) : ('local' as const),
    blob,
    source: (kind: StorageKind, id: string) => {
      if (kind === 'local') return join(directory, id)
      if (!s3) throw new Error('S3 storage is not configured')
      return s3.file(key(id)).presign({ expiresIn: 90 })
    },
    write: async (
      kind: StorageKind,
      id: string,
      body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>,
      type: string,
      preview = false,
    ) => {
      const objectKey = key(id, preview)
      const payload =
        body instanceof Uint8Array
          ? body
          : new Response(body, { headers: { 'content-type': type } })
      if (kind === 's3') {
        if (!s3) throw new Error('S3 storage is not configured')
        await s3.file(objectKey).write(payload, { type })
      } else {
        const localKey = `${id}${preview ? '.jpg' : ''}`
        await mkdir(directory, { recursive: true })
        if (payload instanceof Response) await Bun.write(join(directory, localKey), payload)
        else await Bun.write(join(directory, localKey), payload)
      }
    },
    remove: async (kind: StorageKind, id: string, preview = false) => {
      const object = blob(kind, id, preview)
      if (kind === 's3' || (await object.exists())) await object.delete()
    },
  }
}
export type MediaStorage = ReturnType<typeof createMediaStorage>
