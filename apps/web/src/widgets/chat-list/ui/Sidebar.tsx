import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearch } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { testId, testIds } from '@/shared/lib/test-ids'
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

export const Sidebar = ({ activeChatId }: { activeChatId?: string }) => {
  const { t } = useTranslation()
  const search = useSearch()
  const userId = useChatStore((state) => state.user?.id)
  const chats = useChatStore((state) => state.chats)
  const pinKey = `appercot:pins:${userId ?? ''}`
  const [pinnedIds, setPinnedIds] = useState(() => readPins(pinKey))
  const [query, setQuery] = useState('')
  useEffect(() => {
    setPinnedIds(readPins(pinKey))
  }, [pinKey])
  const normalizedQuery = query.trim().toLowerCase()
  const unreadOnly = new URLSearchParams(search).get('filter') === 'unread'
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
        <SearchInput
          {...testId(testIds.chats.search)}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          aria-label={t('chat:search')}
          placeholder={t('chat:search')}
        />
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
              <Button variant="link" asChild onClick={() => setQuery('')}>
                <Link href="/">{t('chat:clearFilters')}</Link>
              </Button>
            ) : normalizedQuery ? (
              <Button variant="link" onClick={() => setQuery('')}>
                {t('chat:clearSearch')}
              </Button>
            ) : unreadOnly ? (
              <Button variant="link" asChild>
                <Link href="/">{t('chat:clearUnreadFilter')}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </nav>
    </ContextPanel>
  )
}
