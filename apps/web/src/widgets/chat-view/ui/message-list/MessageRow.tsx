import type { BotCommand, Button } from '@appercot/protocol'
import type { CSSProperties } from 'react'
import { BotMessage, SystemMessage, UserMessage } from '@/entities/message'
import type { ShortcutCombination } from '@/shared/lib/shortcuts'
import type { ChatMessage } from '@/shared/model'

const dayFormat = new Intl.DateTimeFormat('ru', { dateStyle: 'long' })

export const MessageRow = ({
  index,
  message,
  previous,
  lastBotMessageId,
  commands,
  buttonShortcuts,
  pendingButtonKey,
  blocked,
  style,
  measureElement,
  onRetry,
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
  style: CSSProperties
  measureElement: (node: Element | null) => void
  onRetry: (clientId: string) => void
  onCommand: (command: string) => void
  onButtonAction: (message: ChatMessage, button: Button, key: string) => void
}) => {
  const date = new Date(message.createdAt)
  const newDay = !previous || date.toDateString() !== new Date(previous.createdAt).toDateString()
  return (
    <li
      data-index={index}
      ref={measureElement}
      className="absolute inset-x-0 top-0 min-w-0 pb-3"
      style={style}
    >
      {newDay ? (
        <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
          {dayFormat.format(date)}
        </p>
      ) : null}
      {message.sender === 'user' ? (
        <UserMessage
          message={message}
          onRetry={onRetry}
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
