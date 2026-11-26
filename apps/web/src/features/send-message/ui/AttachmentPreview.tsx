import { File, FileAudio, FileVideo } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { mediaKindForMime } from '@/entities/message'
import type { AttachmentItem } from '../model/attachment-queue'

export const AttachmentPreview = ({ item }: { item: AttachmentItem }) => {
  const { t } = useTranslation()
  const kind = mediaKindForMime(item.file.type)
  if (item.previewUrl) {
    return (
      <img
        src={item.previewUrl}
        alt={t('upload:preview', { filename: item.file.name })}
        className="size-12 shrink-0 rounded-lg border bg-muted object-cover"
      />
    )
  }
  const Icon = kind === 'video' ? FileVideo : kind === 'audio' ? FileAudio : File
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground">
      <Icon aria-hidden="true" className="size-5" />
    </span>
  )
}
