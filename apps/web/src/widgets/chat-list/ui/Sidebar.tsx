import { ListFilter } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/entities/chat'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ContextPanel } from '@/shared/ui/context-panel'
import { SearchInput } from '@/shared/ui/search-input'
import { ChatListItem } from './ChatListItem'

const readPins = (key: string): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

export const Sidebar = ({ activeChatId }: { activeChatId?: string }) => {
  const { t } = useTranslation()
  const userId = useChatStore((state) => state.user?.id)
  const chats = useChatStore((state) => state.chats)
  const pinKey = `appercot:pins:${userId ?? ''}`
  const unreadKey = `appercot:unread-only:${userId ?? ''}`
  const [pinnedIds, setPinnedIds] = useState(() => readPins(pinKey))
  const [unreadOnly, setUnreadOnly] = useState(() => readFlag(unreadKey))
  const [query, setQuery] = useState('')
  useEffect(() => {
    setPinnedIds(readPins(pinKey))
  }, [pinKey])
  useEffect(() => {
    setUnreadOnly(readFlag(unreadKey))
  }, [unreadKey])
  const normalizedQuery = query.trim().toLowerCase()
  const unreadCount = chats.filter((chat) => chat.unread > 0).length
  const visibleChats = chats.filter(
    (chat) =>
      (!unreadOnly || chat.unread > 0) &&
      (!normalizedQuery ||
        chat.bot.name.toLowerCase().includes(normalizedQuery) ||
        `@${chat.bot.username.toLowerCase()}`.includes(normalizedQuery)),
  )
  const pinned = visibleChats.filter((chat) => pinnedIds.includes(chat.id))
  const rest = visibleChats.filter((chat) => !pinnedIds.includes(chat.id))

  const togglePin = (chatId: string) => {
    const next = pinnedIds.includes(chatId)
      ? pinnedIds.filter((id) => id !== chatId)
      : [...pinnedIds, chatId]
    setPinnedIds(next)
    try {
      localStorage.setItem(pinKey, JSON.stringify(next))
    } catch {
      return
    }
  }
  const toggleUnread = () => {
    const next = !unreadOnly
    setUnreadOnly(next)
    try {
      localStorage.setItem(unreadKey, String(next))
    } catch {
      return
    }
  }

  const renderChat = (chat: (typeof chats)[number], pinned: boolean) => (
    <ChatListItem
      key={chat.id}
      chat={chat}
      active={chat.id === activeChatId}
      pinned={pinned}
      onPin={() => togglePin(chat.id)}
    />
  )
  const emptyMessage = !chats.length
    ? t('chat:noChats')
    : normalizedQuery && unreadOnly
      ? t('chat:noFilterResults')
      : normalizedQuery
        ? t('chat:noSearchResults')
        : t('chat:noUnreadChats')

  return (
    <ContextPanel
      title={t('chat:title')}
      className={activeChatId ? 'hidden' : 'flex'}
      contentClassName="px-2 pb-4"
      search={
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SearchInput
              {...testId(testIds.chats.search)}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              aria-label={t('chat:search')}
              placeholder={t('chat:search')}
            />
          </div>
          <Button
            {...testId(testIds.chats.unreadFilter)}
            type="button"
            variant={unreadOnly ? 'secondary' : 'ghost'}
            size="icon"
            className="size-11 shrink-0 md:size-9"
            aria-label={t('chat:unreadFilter', { count: unreadCount })}
            aria-pressed={unreadOnly}
            title={t('chat:unreadFilter', { count: unreadCount })}
            onClick={toggleUnread}
          >
            <ListFilter aria-hidden="true" />
            <Badge variant={unreadOnly ? 'default' : 'secondary'} className="px-1 text-[10px]">
              {unreadCount}
            </Badge>
          </Button>
        </div>
      }
    >
      <nav aria-label={t('chat:title')}>
        {pinned.length ? (
          <>
            <h3 className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
              {t('chat:pinned')}
            </h3>
            <ul className="mb-3 grid gap-0.5 border-b pb-2">
              {pinned.map((chat) => renderChat(chat, true))}
            </ul>
          </>
        ) : null}
        {rest.length ? (
          <ul className="grid gap-0.5">{rest.map((chat) => renderChat(chat, false))}</ul>
        ) : null}
        {!visibleChats.length ? (
          <div className="px-4 py-10 text-center">
            <p role="status" className="text-sm text-muted-foreground">
              {emptyMessage}
            </p>
            {normalizedQuery && unreadOnly ? (
              <Button
                variant="link"
                onClick={() => {
                  setQuery('')
                  if (unreadOnly) toggleUnread()
                }}
              >
                {t('chat:clearFilters')}
              </Button>
            ) : normalizedQuery ? (
              <Button variant="link" onClick={() => setQuery('')}>
                {t('chat:clearSearch')}
              </Button>
            ) : unreadOnly ? (
              <Button variant="link" onClick={toggleUnread}>
                {t('chat:clearUnreadFilter')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </nav>
    </ContextPanel>
  )
}
