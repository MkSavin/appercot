import type { Media } from '@appercot/protocol'
import { Download, FileIcon } from 'lucide-react'
import { strings } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'

const fileUrl = (fileId: string) => `/api/files/${encodeURIComponent(fileId)}`

export const MediaGallery = ({ media }: { media: Media[] }) => (
  <ul className={cn('my-3 grid gap-3', media.length > 1 && 'sm:grid-cols-2')}>
    {media.map((item) => (
      <li key={item.fileId} className="min-w-0">
        {item.kind === 'image' ? (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="block max-w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label={item.caption ?? strings.message.enlargeImage}
              >
                <img
                  src={fileUrl(item.fileId)}
                  alt={item.caption ?? ''}
                  loading="lazy"
                  className="max-h-96 max-w-full rounded-xl border object-contain"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-3">
              <DialogTitle className="sr-only">{item.caption ?? strings.message.image}</DialogTitle>
              <img
                src={fileUrl(item.fileId)}
                alt={item.caption ?? ''}
                className="max-h-[80dvh] w-full rounded-lg object-contain"
              />
            </DialogContent>
          </Dialog>
        ) : null}
        {item.kind === 'video' ? (
          // biome-ignore lint/a11y/useMediaCaption: Media captions are text-only in the protocol; no subtitle track is available.
          <video
            src={fileUrl(item.fileId)}
            controls
            preload="metadata"
            className="max-h-96 max-w-full rounded-xl border bg-black"
            aria-label={item.caption ?? strings.message.video}
          />
        ) : null}
        {item.kind === 'audio' ? (
          // biome-ignore lint/a11y/useMediaCaption: Media captions are text-only in the protocol; no subtitle track is available.
          <audio
            src={fileUrl(item.fileId)}
            controls
            preload="metadata"
            className="w-full min-w-64"
            aria-label={item.caption ?? strings.message.audio}
          />
        ) : null}
        {item.kind === 'file' ? (
          <Button asChild variant="outline" className="h-auto max-w-full justify-start gap-3 p-4">
            <a href={fileUrl(item.fileId)} download>
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
