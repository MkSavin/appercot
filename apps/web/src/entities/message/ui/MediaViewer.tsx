import type { Media } from '@appercot/protocol'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { MediaPreview } from './MediaPreview'
import { originalUrl } from './media-url'

export const MediaViewer = ({ item }: { item: Media }) => {
  const { t } = useTranslation()
  const video = item.kind === 'video'
  const source = originalUrl(item.fileId)
  const label = item.caption ?? (video ? t('message:playVideo') : t('message:enlargeImage'))
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
          {item.caption ?? (video ? t('message:video') : t('message:image'))}
        </DialogTitle>
        <DialogDescription className="sr-only">{t('message:original')}</DialogDescription>
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
            {t('message:downloadOriginal')}
          </a>
        </Button>
      </DialogContent>
    </Dialog>
  )
}
