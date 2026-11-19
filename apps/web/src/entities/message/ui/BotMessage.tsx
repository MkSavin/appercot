import type { Button } from '@appercot/protocol'
import { lazy, Suspense } from 'react'
import type { ChatMessage } from '@/shared/model'
import type { CommandTextProps } from './CommandText'
import { MediaGallery } from './MediaGallery'
import { MessageKeyboard } from './MessageKeyboard'

const MarkdownContent = lazy(() =>
  import('./MarkdownContent').then(({ MarkdownContent }) => ({ default: MarkdownContent })),
)

interface BotMessageProps extends CommandTextProps {
  message: ChatMessage
  onButtonAction?: (button: Button, key: string) => void
  pendingButtonKey?: string | null
  buttonShortcuts?: Record<string, string | undefined>
}

export const BotMessage = ({
  message,
  onButtonAction,
  pendingButtonKey,
  commands,
  onCommand,
  buttonShortcuts,
}: BotMessageProps) => (
  <article className="grid w-full min-w-0 gap-2 py-2 text-[15px] leading-7 text-foreground">
    {message.content.media ? <MediaGallery media={message.content.media} /> : null}
    {message.content.text ? (
      <Suspense fallback={<p className="whitespace-pre-wrap">{message.content.text}</p>}>
        <MarkdownContent text={message.content.text} commands={commands} onCommand={onCommand} />
      </Suspense>
    ) : null}
    {message.content.buttons && onButtonAction ? (
      <MessageKeyboard
        rows={message.content.buttons}
        messageId={message.id}
        pendingKey={pendingButtonKey}
        onAction={onButtonAction}
        shortcuts={buttonShortcuts}
      />
    ) : null}
    {message.editedAt ? (
      <span className="mt-2 block text-xs text-muted-foreground">изменено</span>
    ) : null}
  </article>
)
