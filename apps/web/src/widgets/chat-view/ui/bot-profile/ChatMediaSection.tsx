import type { Media } from '@appercot/protocol'
import { useTranslation } from 'react-i18next'
import { MediaGallery } from '@/entities/message'
import { Button } from '@/shared/ui/button'

export const ChatMediaSection = ({
  media,
  olderMediaBefore,
  mediaCursors,
  pending,
  onLoadPage,
}: {
  media: Media[]
  olderMediaBefore: number | null
  mediaCursors: number[]
  pending: boolean
  onLoadPage: (cursors: number[]) => void
}) => {
  const { t } = useTranslation()
  return (
    <section className="grid gap-3">
      <h2 className="text-base font-semibold">{t('bot:media')}</h2>
      {media.length ? (
        <div className="settings-card">
          <MediaGallery media={media} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('bot:noMedia')}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {mediaCursors.length > 0 ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onLoadPage(mediaCursors.slice(0, -1))}
          >
            {t('bot:newerMedia')}
          </Button>
        ) : null}
        {olderMediaBefore !== null ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onLoadPage([...mediaCursors, olderMediaBefore])}
          >
            {t('bot:olderMedia')}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
