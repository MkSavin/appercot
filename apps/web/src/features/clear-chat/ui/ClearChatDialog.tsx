import { useState } from 'react'
import { clearChatRequest, useChatStore } from '@/entities/chat'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
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
import { clearChatHistory } from '../model/clear-chat-history'

interface ClearChatDialogProps {
  chatId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ClearChatDialog = ({ chatId, open, onOpenChange }: ClearChatDialogProps) => {
  const [submitting, setSubmitting] = useState(false)

  const clear = async () => {
    setSubmitting(true)
    try {
      await clearChatHistory(useChatStore, chatId, clearChatRequest)
      onOpenChange(false)
    } catch (error) {
      showRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{strings.chat.clearChatTitle}</AlertDialogTitle>
          <AlertDialogDescription>{strings.chat.clearChatDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{strings.chat.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={submitting}
            onClick={(event) => {
              event.preventDefault()
              void clear()
            }}
          >
            {strings.chat.clearChat}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
