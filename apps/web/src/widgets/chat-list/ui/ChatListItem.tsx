import type { ClientChat } from '@appercot/protocol'
import { BellOff, Pin } from 'lucide-react'
import { ContextMenu } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { BotAvatar } from '@/entities/bot'
import { UnreadBadge, useChatStore } from '@/entities/chat'
import { useNotificationMute } from '@/features/chat-notifications'
import { cn } from '@/shared/lib/cn'
import { formatDate } from '@/shared/lib/format-date'
import { testId, testIds } from '@/shared/lib/test-ids'

interface ChatListItemProps {
  chat: ClientChat
  active: boolean
  pinned: boolean
  onPin: () => void
}

export const ChatListItem = ({ chat, active, pinned, onPin }: ChatListItemProps) => {
  const { t, i18n } = useTranslation()
  const cached = useChatStore((state) => state.messagesByChat[chat.id]?.at(-1))
  const muted = useNotificationMute(chat.notificationsMutedUntil)
  const latest = cached && cached.seq > (chat.preview?.seq ?? 0) ? cached : chat.preview
  const content = latest?.content
  const preview = content?.text || (content?.media?.length ? t('chat:attachment') : undefined)
  const date = chat.lastMessageAt ? new Date(chat.lastMessageAt) : null
  return (
    <li className={cn('group flex min-w-0 items-center rounded-lg', active && 'bg-secondary')}>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <Link
            {...testId(testIds.chats.item(chat.id))}
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
                    {formatDate(
                      date,
                      i18n.resolvedLanguage,
                      date.toDateString() === new Date().toDateString()
                        ? { hour: '2-digit', minute: '2-digit' }
                        : { day: 'numeric', month: 'short' },
                    )}
                  </time>
                ) : null}
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">
                  {preview || chat.bot.description || `@${chat.bot.username}`}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {muted.active ? (
                    <BellOff
                      className="size-3.5 text-muted-foreground"
                      aria-label={t('bot:notificationsMuted')}
                    />
                  ) : null}
                  <UnreadBadge count={chat.unread} />
                </span>
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
