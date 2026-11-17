import type { ClientChat } from '@appercot/protocol'
import { Link } from 'wouter'
import { BotAvatar } from '@/entities/bot'
import { UnreadBadge } from '@/entities/chat'
import { cn } from '@/shared/lib/cn'

interface ChatListItemProps {
  chat: ClientChat
  active: boolean
  preview?: string
}

export const ChatListItem = ({ chat, active, preview }: ChatListItemProps) => (
  <li className="min-w-0">
    <Link
      href={`/c/${chat.id}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring',
        active && 'bg-sidebar-accent',
      )}
    >
      <BotAvatar bot={chat.bot} showPresence />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{chat.bot.name}</span>
          {chat.lastMessageAt ? (
            <time
              className="shrink-0 text-[11px] text-muted-foreground"
              dateTime={new Date(chat.lastMessageAt).toISOString()}
            >
              {new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(
                chat.lastMessageAt,
              )}
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
  </li>
)
