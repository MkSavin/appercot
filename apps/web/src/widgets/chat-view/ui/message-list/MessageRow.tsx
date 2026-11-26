import type { BotCommand, Button } from '@appercot/protocol'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { BotMessage, SystemMessage, UserMessage } from '@/entities/message'
import { cn } from '@/shared/lib/cn'
import { formatDate } from '@/shared/lib/format-date'
import type { ShortcutCombination } from '@/shared/lib/shortcuts'
import { testId, testIds } from '@/shared/lib/test-ids'
import type { ChatMessage } from '@/shared/model'

export const MessageRow = ({
  index,
  message,
  previous,
  lastBotMessageId,
  commands,
  buttonShortcuts,
  pendingButtonKey,
  blocked,
  highlighted = false,
  style,
  measureElement,
  onRetry,
  onDelete,
  onCommand,
  onButtonAction,
}: {
  index: number
  message: ChatMessage
  previous?: ChatMessage
  lastBotMessageId?: string
  commands: BotCommand[]
  buttonShortcuts: Record<string, ShortcutCombination | undefined>
  pendingButtonKey: string | null
  blocked: boolean
  highlighted?: boolean
  style: CSSProperties
  measureElement: (node: Element | null) => void
  onRetry: (clientId: string) => void
  onDelete: (clientId: string) => void
  onCommand: (command: string) => void
  onButtonAction: (message: ChatMessage, button: Button, key: string) => void
}) => {
  const { i18n } = useTranslation()
  const date = new Date(message.createdAt)
  const newDay = !previous || date.toDateString() !== new Date(previous.createdAt).toDateString()
  return (
    <li
      {...testId(testIds.message.item(message.id))}
      id={`history-message-${message.id}`}
      data-index={index}
      data-search-target={highlighted ? 'true' : undefined}
      aria-current={highlighted ? 'location' : undefined}
      tabIndex={highlighted ? -1 : undefined}
      ref={measureElement}
      className={cn(
        'absolute inset-x-0 top-0 min-w-0 rounded-lg pb-3 outline-none',
        highlighted && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
      style={style}
    >
      {newDay ? (
        <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
          {formatDate(date, i18n.resolvedLanguage, { dateStyle: 'long' })}
        </p>
      ) : null}
      {message.sender === 'user' ? (
        <UserMessage
          message={message}
          onRetry={onRetry}
          onDelete={onDelete}
          commands={commands}
          onCommand={blocked ? undefined : onCommand}
        />
      ) : message.sender === 'system' ? (
        <SystemMessage text={message.content.text ?? ''} />
      ) : (
        <BotMessage
          message={message}
          commands={commands}
          onCommand={blocked ? undefined : onCommand}
          buttonShortcuts={
            message.id === lastBotMessageId && !blocked ? buttonShortcuts : undefined
          }
          pendingButtonKey={pendingButtonKey}
          onButtonAction={(button, key) => onButtonAction(message, button, key)}
        />
      )}
    </li>
  )
}
