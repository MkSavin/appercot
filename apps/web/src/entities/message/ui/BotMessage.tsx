import type { Button } from '@appercot/protocol'
import type { ChatMessage } from '@/shared/model'
import { MarkdownContent } from './MarkdownContent'
import { MediaGallery } from './MediaGallery'
import { MessageKeyboard } from './MessageKeyboard'

interface BotMessageProps {
  message: ChatMessage
  onButtonAction?: (button: Button, key: string) => void
  pendingButtonKey?: string | null
}

export const BotMessage = ({ message, onButtonAction, pendingButtonKey }: BotMessageProps) => (
  <article className="w-full py-5 text-[15px] leading-7 text-foreground first:pt-0">
    {message.content.media ? <MediaGallery media={message.content.media} /> : null}
    {message.content.text ? <MarkdownContent text={message.content.text} /> : null}
    {message.content.buttons && onButtonAction ? (
      <MessageKeyboard
        rows={message.content.buttons}
        messageId={message.id}
        pendingKey={pendingButtonKey}
        onAction={onButtonAction}
      />
    ) : null}
    {message.editedAt ? (
      <span className="mt-2 block text-xs text-muted-foreground">изменено</span>
    ) : null}
  </article>
)
