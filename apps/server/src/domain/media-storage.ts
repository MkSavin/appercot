import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { S3Client } from 'bun'
import type { AppEnv } from '../env'

export type StorageKind = 'local' | 's3'

export const createMediaStorage = (env: AppEnv) => {
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
  const blob = (kind: StorageKind, id: string, preview = false) => {
    const key = preview ? `${id}.jpg` : id
    if (kind === 'local') return Bun.file(join(directory, key))
    if (!s3) throw new Error('S3 storage is not configured')
    return s3.file(`files/${key}`)
  }
  return {
    kind: s3 ? ('s3' as const) : ('local' as const),
    blob,
    source: (kind: StorageKind, id: string) => {
      if (kind === 'local') return join(directory, id)
      if (!s3) throw new Error('S3 storage is not configured')
      return s3.file(`files/${id}`).presign({ expiresIn: 90 })
    },
    write: async (
      kind: StorageKind,
      id: string,
      body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>,
      type: string,
      preview = false,
    ) => {
      const key = preview ? `${id}.jpg` : id
      const payload =
        body instanceof Uint8Array
          ? body
          : new Response(body, { headers: { 'content-type': type } })
      if (kind === 's3') {
        if (!s3) throw new Error('S3 storage is not configured')
        await s3.file(`files/${key}`).write(payload, { type })
      } else {
        await mkdir(directory, { recursive: true })
        if (payload instanceof Response) await Bun.write(join(directory, key), payload)
        else await Bun.write(join(directory, key), payload)
      }
    },
    remove: async (kind: StorageKind, id: string, preview = false) => {
      const object = blob(kind, id, preview)
      if (kind === 's3' || (await object.exists())) await object.delete()
    },
  }
}
export type MediaStorage = ReturnType<typeof createMediaStorage>
