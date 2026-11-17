import { RotateCcw } from 'lucide-react'
import { strings } from '@/shared/config'
import type { ChatMessage } from '@/shared/model'
import { Button } from '@/shared/ui/button'
import { StatusTicks } from './StatusTicks'

interface UserMessageProps {
  message: ChatMessage
  onRetry?: (clientId: string) => void
}

export const UserMessage = ({ message, onRetry }: UserMessageProps) => (
  <article className="flex justify-end py-2">
    <div className="max-w-[80%] min-w-0">
      <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-primary-foreground shadow-sm">
        {message.content.text}
      </div>
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
