import { useEffect, useRef } from 'react'
import { BotMessage, UserMessage } from '@/entities/message'
import { strings } from '@/shared/config'
import type { ChatMessage } from '@/shared/model'
import { Button } from '@/shared/ui/button'

interface MessageListProps {
  chatId: string
  messages: ChatMessage[]
  hasMore: boolean
  loading: boolean
  onLoadEarlier: () => void
  onRetry: (clientId: string) => void
}

export const MessageList = ({
  chatId,
  messages,
  hasMore,
  loading,
  onLoadEarlier,
  onRetry,
}: MessageListProps) => {
  const endRef = useRef<HTMLDivElement>(null)
  const previousLastId = useRef<string | null>(null)
  const lastId = messages.at(-1)?.id ?? null

  useEffect(() => {
    if (lastId === previousLastId.current) return
    previousLastId.current = lastId
    endRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' })
  }, [lastId])

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [scrollbar-gutter:stable] md:px-8"
      role="log"
      aria-label={strings.chat.title}
      data-chat-id={chatId}
    >
      <div className="mx-auto max-w-3xl py-6">
        {hasMore ? (
          <div className="mb-5 text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLoadEarlier}
              disabled={loading}
            >
              {strings.chat.loadEarlier}
            </Button>
          </div>
        ) : null}
        {messages.length === 0 && !loading ? (
          <div className="grid min-h-[40dvh] place-items-center text-center">
            <p className="text-sm text-muted-foreground">{strings.chat.noMessages}</p>
          </div>
        ) : (
          <ol className="divide-y divide-border/50">
            {messages.map((message) => (
              <li key={message.id} className="last:[scroll-initial-target:nearest]">
                {message.sender === 'user' ? (
                  <UserMessage message={message} onRetry={onRetry} />
                ) : (
                  <BotMessage message={{ ...message, sender: message.sender }} />
                )}
              </li>
            ))}
          </ol>
        )}
        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{strings.chat.loading}</p>
        ) : null}
        <div ref={endRef} aria-hidden="true" />
      </div>
    </div>
  )
}
