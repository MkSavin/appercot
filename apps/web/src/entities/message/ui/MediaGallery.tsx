import type { Media } from '@appercot/protocol'
import { Download, FileIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { MediaViewer } from './MediaViewer'
import { originalUrl } from './media-url'

export const MediaGallery = ({ media }: { media: Media[] }) => {
  const { t } = useTranslation()
  return (
    <ul className={cn('my-3 grid gap-3', media.length > 1 && 'sm:grid-cols-2')}>
      {media.map((item) => (
        <li
          {...testId(testIds.message.attachment(item.fileId))}
          key={item.fileId}
          className="min-w-0"
        >
          {item.kind === 'image' || item.kind === 'video' ? <MediaViewer item={item} /> : null}
          {item.kind === 'audio' ? (
            // biome-ignore lint/a11y/useMediaCaption: The bot protocol carries a text caption but no subtitle track.
            <audio
              src={originalUrl(item.fileId)}
              controls
              preload="none"
              className="w-full max-w-md"
              aria-label={item.caption ?? t('message:audio')}
            />
          ) : null}
          {item.kind === 'file' ? (
            <Button asChild variant="outline" className="h-auto max-w-full justify-start gap-3 p-4">
              <a href={originalUrl(item.fileId, true)} download>
                <FileIcon aria-hidden="true" className="size-6 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.caption ?? t('message:file')}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Download aria-hidden="true" />
                    {t('message:download')}
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
}
