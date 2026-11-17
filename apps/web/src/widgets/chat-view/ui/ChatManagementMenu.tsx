import { Ban, MoreVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BlockBotDialog } from '@/features/block-bot'
import { ClearChatDialog } from '@/features/clear-chat'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

export const ChatManagementMenu = ({ chatId }: { chatId: string }) => {
  const [clearOpen, setClearOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={strings.chat.manageChat}>
            <MoreVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setClearOpen(true)}>
            <Trash2 aria-hidden="true" />
            {strings.chat.clearChat}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setBlockOpen(true)}>
            <Ban aria-hidden="true" />
            {strings.chat.blockBot}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ClearChatDialog chatId={chatId} open={clearOpen} onOpenChange={setClearOpen} />
      <BlockBotDialog chatId={chatId} open={blockOpen} onOpenChange={setBlockOpen} />
    </>
  )
}
