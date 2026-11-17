import { LoaderCircle, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { blockBotRequest, useChatStore } from '@/entities/chat'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { updateChatBlocked } from '../model/update-chat-blocked'

export const BlockedChatNotice = ({ chatId }: { chatId: string }) => {
  const [submitting, setSubmitting] = useState(false)

  const unblock = async () => {
    setSubmitting(true)
    try {
      await updateChatBlocked(useChatStore, chatId, false, blockBotRequest)
    } catch (error) {
      showRequestError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 border-t bg-secondary/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LockKeyhole aria-hidden="true" className="size-4" />
        {strings.chat.blockedNotice}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={unblock} disabled={submitting}>
        {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        {strings.chat.unblockBot}
      </Button>
    </div>
  )
}
