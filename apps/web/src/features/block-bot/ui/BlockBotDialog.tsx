import { useState } from 'react'
import { blockBotRequest, useChatStore } from '@/entities/chat'
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
import { updateChatBlocked } from '../model/update-chat-blocked'

interface BlockBotDialogProps {
  chatId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const BlockBotDialog = ({ chatId, open, onOpenChange }: BlockBotDialogProps) => {
  const [submitting, setSubmitting] = useState(false)

  const block = async () => {
    setSubmitting(true)
    try {
      await updateChatBlocked(useChatStore, chatId, true, blockBotRequest)
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
          <AlertDialogTitle>{strings.chat.blockBotTitle}</AlertDialogTitle>
          <AlertDialogDescription>{strings.chat.blockBotDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{strings.chat.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={submitting}
            onClick={(event) => {
              event.preventDefault()
              void block()
            }}
          >
            {strings.chat.blockBot}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
