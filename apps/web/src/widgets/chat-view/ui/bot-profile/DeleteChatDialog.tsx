import { useTranslation } from 'react-i18next'
import { useLocation } from 'wouter'
import { deleteChatRequest, useChatStore } from '@/entities/chat'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'

export const DeleteChatDialog = ({
  chatId,
  open,
  pending,
  run,
  onOpenChange,
}: {
  chatId: string
  open: boolean
  pending: boolean
  run: (operation: () => Promise<void>) => Promise<void>
  onOpenChange: (open: boolean) => void
}) => {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const unsentCount = useChatStore((state) => state.pendingByChat[chatId]?.length ?? 0)
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('bot:deleteChatTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('bot:deleteChatDescription')}{' '}
            {unsentCount ? t('chat:deleteChatOutboxWarning', { count: unsentCount }) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('common:cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              void run(async () => {
                await deleteChatRequest(chatId)
                useChatStore.getState().removeChat(chatId)
                navigate('/', { replace: true })
              })
            }}
          >
            {t('bot:deleteChat')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
