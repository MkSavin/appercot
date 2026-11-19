import type { Button } from '@appercot/protocol'
import { LoaderCircle } from 'lucide-react'
import { displayShortcut, type ShortcutCombination } from '@/shared/lib/shortcuts'
import { Button as UiButton } from '@/shared/ui/button'
import { Kbd } from '@/shared/ui/kbd'

interface MessageKeyboardProps {
  rows: Button[][]
  onAction: (button: Button, key: string) => void
  pendingKey?: string | null
  messageId?: string
  shortcuts?: Record<string, ShortcutCombination | undefined>
}

export const MessageKeyboard = ({
  rows,
  onAction,
  pendingKey,
  messageId = '',
  shortcuts,
}: MessageKeyboardProps) => (
  <div className="mt-3 grid max-w-xl gap-2">
    {rows.map((row, rowIndex) => (
      <div className="flex flex-wrap gap-2" key={row.map((button) => button.text).join(':')}>
        {row.map((button, columnIndex) => {
          const key = `${messageId}:${rowIndex}:${columnIndex}`
          const pending = pendingKey === key
          const shortcut = shortcuts?.[key]
          return (
            <UiButton
              type="button"
              variant="outline"
              size="sm"
              className="min-w-24 flex-1 bg-background text-primary shadow-none"
              key={key}
              disabled={pendingKey !== null && pendingKey !== undefined}
              onClick={() => onAction(button, key)}
            >
              {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              {button.text}
              {shortcut ? <Kbd>{displayShortcut(shortcut)}</Kbd> : null}
            </UiButton>
          )
        })}
      </div>
    ))}
  </div>
)
