import type { Media } from '@appercot/protocol'
import { Download, FileIcon, ImageIcon, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { strings } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'

const fileUrl = (fileId: string) => `/api/files/${encodeURIComponent(fileId)}`
const originalUrl = (fileId: string, download = false) =>
  `${fileUrl(fileId)}?${download ? 'download=1&' : ''}v=2`
const retryDelays = [1000, 2500, 5000, 10_000, 15_000]

let active = 0
const previewQueue: Array<() => void> = []
const schedulePreview = (url: string, signal: AbortSignal) =>
  new Promise<{ status: number; blob?: Blob }>((resolve, reject) => {
    const abortQueued = () => {
      const index = previewQueue.indexOf(start)
      if (index !== -1) previewQueue.splice(index, 1)
      reject(signal.reason)
    }
    const start = () => {
      signal.removeEventListener('abort', abortQueued)
      if (signal.aborted) {
        reject(signal.reason)
        return
      }
      active++
      void fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) })
        .then(async (result) =>
          resolve({
            status: result.status,
            ...(result.status === 200 ? { blob: await result.blob() } : {}),
          }),
        )
        .catch(reject)
        .finally(() => {
          active--
          while (active < 6 && previewQueue.length) previewQueue.shift()?.()
        })
    }
    if (active < 6) start()
    else {
      previewQueue.push(start)
      signal.addEventListener('abort', abortQueued, { once: true })
      if (signal.aborted) abortQueued()
    }
  })

const MediaPreview = ({ id, video }: { id: string; video: boolean }) => {
  const element = useRef<HTMLSpanElement>(null)
  const [image, setImage] = useState<string>()
  useEffect(() => {
    const host = element.current
    if (!host) return
    const abort = new AbortController()
    let timeout: ReturnType<typeof setTimeout> | undefined
    let objectUrl: string | undefined
    let attempts = 0
    const load = () => {
      void schedulePreview(`${fileUrl(id)}/thumbnail`, abort.signal)
        .then(({ status, blob }) => {
          if (abort.signal.aborted) return
          if (blob?.size) {
            objectUrl = URL.createObjectURL(blob)
            setImage(objectUrl)
            return
          }
          const delay = retryDelays[attempts++]
          if ((status === 202 || status === 429) && delay !== undefined)
            timeout = setTimeout(load, delay)
        })
        .catch(() => {})
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        load()
      },
      { rootMargin: '240px' },
    )
    observer.observe(host)
    return () => {
      observer.disconnect()
      abort.abort()
      if (timeout !== undefined) clearTimeout(timeout)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return (
    <span
      ref={element}
      className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-lg bg-muted"
    >
      {image ? (
        <img src={image} alt="" className="absolute inset-0 size-full object-contain" />
      ) : (
        <ImageIcon aria-hidden="true" className="size-7 text-muted-foreground" />
      )}
      {video ? (
        <span className="relative grid size-11 place-items-center rounded-full bg-black/70 text-white">
          <Play className="size-5 fill-current" aria-hidden="true" />
        </span>
      ) : null}
    </span>
  )
}

const ViewMedia = ({ item }: { item: Media }) => {
  const video = item.kind === 'video'
  const source = originalUrl(item.fileId)
  const label = item.caption ?? (video ? 'Воспроизвести видео' : strings.message.enlargeImage)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="block w-full max-w-md rounded-lg text-left focus-visible:outline-2 focus-visible:outline-ring"
        >
          <MediaPreview id={item.fileId} video={video} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-auto sm:max-w-4xl">
        <DialogTitle className="pr-8">
          {item.caption ?? (video ? strings.message.video : strings.message.image)}
        </DialogTitle>
        <DialogDescription className="sr-only">Оригинал вложения</DialogDescription>
        {video ? (
          // biome-ignore lint/a11y/useMediaCaption: The bot protocol carries a text caption but no subtitle track.
          <video
            src={source}
            controls
            playsInline
            preload="metadata"
            className="max-h-[70dvh] w-full rounded-lg bg-black"
            aria-label={label}
          />
        ) : (
          <img
            src={source}
            alt={item.caption ?? ''}
            className="max-h-[70dvh] w-full rounded-lg object-contain"
          />
        )}
        <Button asChild variant="outline" size="sm" className="justify-self-start">
          <a href={originalUrl(item.fileId, true)} download>
            <Download aria-hidden="true" />
            Скачать оригинал
          </a>
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export const MediaGallery = ({ media }: { media: Media[] }) => (
  <ul className={cn('my-3 grid gap-3', media.length > 1 && 'sm:grid-cols-2')}>
    {media.map((item) => (
      <li key={item.fileId} className="min-w-0">
        {item.kind === 'image' || item.kind === 'video' ? <ViewMedia item={item} /> : null}
        {item.kind === 'audio' ? (
          // biome-ignore lint/a11y/useMediaCaption: The bot protocol carries a text caption but no subtitle track.
          <audio
            src={originalUrl(item.fileId)}
            controls
            preload="none"
            className="w-full max-w-md"
            aria-label={item.caption ?? strings.message.audio}
          />
        ) : null}
        {item.kind === 'file' ? (
          <Button asChild variant="outline" className="h-auto max-w-full justify-start gap-3 p-4">
            <a href={originalUrl(item.fileId, true)} download>
              <FileIcon aria-hidden="true" className="size-6 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.caption ?? strings.message.file}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Download aria-hidden="true" />
                  {strings.message.download}
                </span>
              </span>
            </a>
          </Button>
        ) : null}
        {item.caption && item.kind !== 'file' ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{item.caption}</p>
        ) : null}
      </li>
    ))}
  </ul>
)
