import { ImageIcon, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { fileUrl } from './media-url'

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

export const MediaPreview = ({ id, video }: { id: string; video: boolean }) => {
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
