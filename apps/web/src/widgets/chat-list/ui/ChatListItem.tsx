import type { ClientChat } from '@appercot/protocol'
import { Pin } from 'lucide-react'
import { ContextMenu } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { BotAvatar } from '@/entities/bot'
import { UnreadBadge, useChatStore } from '@/entities/chat'
import { cn } from '@/shared/lib/cn'

interface ChatListItemProps {
  chat: ClientChat
  active: boolean
  pinned: boolean
  onPin: () => void
}

const timeFormat = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' })

export const ChatListItem = ({ chat, active, pinned, onPin }: ChatListItemProps) => {
  const { t } = useTranslation()
  const content = useChatStore((state) => state.messagesByChat[chat.id]?.at(-1)?.content)
  const preview = content?.text || (content?.media?.length ? t('chat:attachment') : undefined)
  const date = chat.lastMessageAt ? new Date(chat.lastMessageAt) : null
  return (
    <li className={cn('group flex min-w-0 items-center rounded-lg', active && 'bg-secondary')}>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <Link
            href={`/c/${chat.id}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'workspace-link flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-3',
            )}
          >
            <BotAvatar bot={chat.bot} showPresence />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{chat.bot.name}</span>
                {date ? (
                  <time
                    className="shrink-0 text-[11px] text-muted-foreground"
                    dateTime={date.toISOString()}
                  >
                    {(date.toDateString() === new Date().toDateString()
                      ? timeFormat
                      : dateFormat
                    ).format(date)}
                  </time>
                ) : null}
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">
                  {preview || chat.bot.description || `@${chat.bot.username}`}
                </span>
                <UnreadBadge count={chat.unread} />
              </span>
            </span>
          </Link>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content className="z-50 min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
            <ContextMenu.Item
              onSelect={onPin}
              className="flex min-h-10 cursor-default items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-secondary"
            >
              <Pin aria-hidden="true" className="size-4" />
              {pinned ? t('chat:unpin') : t('chat:pin')}
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </li>
  )
}
