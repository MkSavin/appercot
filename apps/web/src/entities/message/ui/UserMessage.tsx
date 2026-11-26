import { RotateCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { testId, testIds } from '@/shared/lib/test-ids'
import type { ChatMessage } from '@/shared/model'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { CommandText, type CommandTextProps } from './CommandText'
import { MediaGallery } from './MediaGallery'
import { StatusTicks } from './StatusTicks'

interface UserMessageProps extends CommandTextProps {
  message: ChatMessage
  onRetry?: (clientId: string) => void
  onDelete?: (clientId: string) => void
}

export const UserMessage = ({
  message,
  onRetry,
  onDelete,
  commands,
  onCommand,
}: UserMessageProps) => {
  const { t } = useTranslation()
  const clientId = message.clientId
  const failed = message.status === 'failed' && clientId
  return (
    <article className="flex justify-end py-2">
      <div className="max-w-[80%] min-w-0">
        {message.content.media ? <MediaGallery media={message.content.media} /> : null}
        {message.content.text ? (
          <div className="outgoing-bubble rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap">
            <CommandText text={message.content.text} commands={commands} onCommand={onCommand} />
          </div>
        ) : null}
        <div className="mt-1 flex items-center justify-end gap-1 text-primary/70">
          {failed && onRetry ? (
            <Button
              {...testId(testIds.message.retry(clientId))}
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 text-destructive hover:text-destructive sm:min-h-8"
              onClick={() => onRetry(clientId)}
            >
              <RotateCcw aria-hidden="true" />
              {t('chat:retry')}
            </Button>
          ) : null}
          {failed && onDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  {...testId(testIds.message.delete(clientId))}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 text-destructive hover:text-destructive sm:min-h-8"
                >
                  <Trash2 aria-hidden="true" />
                  {t('chat:deleteUnsent')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('chat:deleteUnsentTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('chat:deleteUnsentDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => onDelete(clientId)}>
                    {t('chat:deleteUnsent')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          <StatusTicks status={message.status} />
        </div>
      </div>
    </article>
  )
}
