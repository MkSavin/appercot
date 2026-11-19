import type { Media } from '@appercot/protocol'

export type UploadSource =
  | string
  | URL
  | Blob
  | ArrayBuffer
  | Uint8Array<ArrayBufferLike>
  | ReadableStream<Uint8Array>
export interface UploadOptions {
  name?: string
  mime?: string
  signal?: AbortSignal
}
export interface SendFileOptions extends UploadOptions {
  kind?: Media['kind']
  caption?: string
}
export const mediaKindForUpload = (mime: string): Media['kind'] => {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'file'
}
