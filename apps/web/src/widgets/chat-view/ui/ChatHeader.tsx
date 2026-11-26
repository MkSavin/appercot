import type { ClientChat } from '@appercot/protocol'
import { ArrowLeft, Circle, Search } from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { BotAvatar } from '@/entities/bot'
import { ChatNotificationMenu } from '@/features/chat-notifications'
import { cn } from '@/shared/lib/cn'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'

export const ChatHeader = ({
  chatId,
  bot,
  onOpenSearch,
  searchTriggerRef,
}: {
  chatId: string
  bot: ClientChat['bot']
  onOpenSearch: () => void
  searchTriggerRef: RefObject<HTMLButtonElement | null>
}) => {
  const { t } = useTranslation()
  return (
    <header className="shrink-0 border-b bg-card pt-[env(safe-area-inset-top)]">
      <div className="relative flex h-16 items-stretch">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="absolute top-1/2 left-2 z-10 -translate-y-1/2 md:hidden"
        >
          <Link href="/" aria-label={t('chat:back')}>
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <Link
          href={`/c/${chatId}/profile`}
          className="flex min-w-0 flex-1 items-center gap-3 pr-2 pl-14 hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 md:px-6"
          aria-label={t('chat:botProfile', { name: bot.name })}
        >
          <BotAvatar bot={bot} />
          <div className="min-w-0">
            <h1 id="chat-title" className="truncate text-[15px] font-semibold">
              {bot.name}
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Circle
                aria-hidden="true"
                className={cn(
                  'size-2 fill-current',
                  bot.online ? 'text-emerald-500' : 'text-zinc-400',
                )}
              />
              {bot.online ? t('chat:online') : t('chat:offlineStatus')}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1 pr-2 md:pr-4">
          <Button
            {...testId(testIds.chat.search.trigger)}
            ref={searchTriggerRef}
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 md:size-9"
            aria-label={t('chat:messageSearch.open')}
            onClick={onOpenSearch}
          >
            <Search aria-hidden="true" />
          </Button>
          <ChatNotificationMenu chatId={chatId} />
        </div>
      </div>
    </header>
  )
}
