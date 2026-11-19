import { RotateCcw } from 'lucide-react'
import { strings } from '@/shared/config'
import type { ChatMessage } from '@/shared/model'
import { Button } from '@/shared/ui/button'
import { CommandText, type CommandTextProps } from './CommandText'
import { MediaGallery } from './MediaGallery'
import { StatusTicks } from './StatusTicks'

interface UserMessageProps extends CommandTextProps {
  message: ChatMessage
  onRetry?: (clientId: string) => void
}

export const UserMessage = ({ message, onRetry, commands, onCommand }: UserMessageProps) => (
  <article className="flex justify-end py-2">
    <div className="max-w-[80%] min-w-0">
      {message.content.media ? <MediaGallery media={message.content.media} /> : null}
      {message.content.text ? (
        <div className="outgoing-bubble rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap">
          <CommandText text={message.content.text} commands={commands} onCommand={onCommand} />
        </div>
      ) : null}
      <div className="mt-1 flex items-center justify-end gap-2 text-primary/70">
        {message.status === 'failed' && message.clientId && onRetry ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-6 text-destructive hover:text-destructive"
            onClick={() => {
              const clientId = message.clientId
              if (clientId) onRetry(clientId)
            }}
          >
            <RotateCcw aria-hidden="true" />
            {strings.chat.retry}
          </Button>
        ) : null}
        <StatusTicks status={message.status} />
      </div>
    </div>
  </article>
)
