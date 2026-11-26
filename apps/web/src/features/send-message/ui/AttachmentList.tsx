import { RotateCcw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { i18n } from '@/shared/config'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import type { AttachmentItem, AttachmentNotice } from '../model/attachment-queue'
import { formatBytes } from '../model/format-bytes'
import { AttachmentPreview } from './AttachmentPreview'

const permanentErrors = new Set(['TOO_LARGE', 'UNSUPPORTED', 'UNAUTHORIZED', 'FORBIDDEN'])

const AttachmentRow = ({
  item,
  onCancel,
  onRetry,
  onRemove,
}: {
  item: AttachmentItem
  onCancel: (localId: string) => void
  onRetry: (localId: string) => void
  onRemove: (localId: string) => void
}) => {
  const { t } = useTranslation()
  const completing =
    item.status === 'uploading' &&
    item.progress.lengthComputable &&
    item.progress.loaded >= item.progress.total
  const status =
    item.status === 'queued' && item.error?.code === 'RATE_LIMIT'
      ? t('upload:status.rateLimited', { seconds: Math.ceil((item.error.retryAfter ?? 0) / 1000) })
      : completing
        ? t('upload:status.completing')
        : t(`upload:status.${item.status}`)
  const canRetry =
    ['failed', 'cancelled'].includes(item.status) && !permanentErrors.has(item.error?.code ?? '')
  const canCancel = ['selected', 'queued', 'uploading'].includes(item.status)
  return (
    <li
      {...testId(testIds.chat.attachment.item(item.localId))}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-background p-2"
    >
      <AttachmentPreview item={item} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" title={item.file.name}>
          {item.file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(item.file.size, i18n.language)} · {item.file.type || t('upload:unknownType')}
        </p>
        <span
          role="status"
          aria-live="polite"
          className="mt-0.5 block text-xs text-muted-foreground"
        >
          {status}
        </span>
        {item.error && item.status === 'failed' ? (
          <p className="mt-0.5 text-xs text-destructive">
            {t(`upload:error.${item.error.code}`, {
              limit: item.error.limit ? formatBytes(item.error.limit, i18n.language) : undefined,
            })}
          </p>
        ) : null}
        {item.status === 'uploading' ? (
          <progress
            {...testId(testIds.chat.attachment.progress(item.localId))}
            max={item.progress.lengthComputable ? item.progress.total : undefined}
            value={item.progress.lengthComputable ? item.progress.loaded : undefined}
            aria-label={t('upload:progress', { filename: item.file.name })}
            className="mt-1.5 h-1.5 w-full accent-primary"
          />
        ) : null}
      </div>
      <div className="flex items-center gap-0.5">
        {canRetry ? (
          <Button
            {...testId(testIds.chat.attachment.retry(item.localId))}
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-10 min-w-10"
            aria-label={t('upload:retry', { filename: item.file.name })}
            title={t('upload:retry', { filename: item.file.name })}
            onClick={() => onRetry(item.localId)}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            {...testId(testIds.chat.attachment.cancel(item.localId))}
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-10 min-w-10"
            aria-label={t('upload:cancel', { filename: item.file.name })}
            title={t('upload:cancel', { filename: item.file.name })}
            onClick={() => onCancel(item.localId)}
          >
            <X aria-hidden="true" />
          </Button>
        ) : (
          <Button
            {...testId(testIds.chat.attachment.remove(item.localId))}
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-10 min-w-10"
            aria-label={t('upload:remove', { filename: item.file.name })}
            title={t('upload:remove', { filename: item.file.name })}
            onClick={() => onRemove(item.localId)}
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
    </li>
  )
}

export const AttachmentList = ({
  items,
  notice,
  waiting,
  onCancel,
  onRetry,
  onRemove,
}: {
  items: readonly AttachmentItem[]
  notice?: AttachmentNotice
  waiting: boolean
  onCancel: (localId: string) => void
  onRetry: (localId: string) => void
  onRemove: (localId: string) => void
}) => {
  const { t } = useTranslation()
  if (!items.length) return null
  return (
    <div className="mx-1 mt-1 grid gap-1.5">
      <ul
        {...testId(testIds.chat.composer.attachments)}
        className="grid max-h-72 gap-1.5 overflow-y-auto"
      >
        {items.map((item) => (
          <AttachmentRow
            key={item.localId}
            item={item}
            onCancel={onCancel}
            onRetry={onRetry}
            onRemove={onRemove}
          />
        ))}
      </ul>
      {notice ? (
        <p className="px-1 text-xs text-destructive">
          {t(`upload:notice.${notice.code}`, { count: notice.count, limit: notice.limit })}
        </p>
      ) : null}
      {waiting ? (
        <p
          {...testId(testIds.chat.composer.waiting)}
          role="status"
          className="px-1 text-xs text-muted-foreground"
        >
          {t('upload:waitingForFiles')}
        </p>
      ) : null}
      <p className="px-1 text-[11px] text-muted-foreground">{t('upload:volatile')}</p>
    </div>
  )
}
