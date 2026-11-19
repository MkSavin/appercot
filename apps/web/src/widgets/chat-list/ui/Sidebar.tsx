import { useState } from 'react'
import { useChatStore } from '@/entities/chat'
import { strings } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
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
  const userId = useChatStore((state) => state.user?.id)
  const chats = useChatStore((state) => state.chats)
  const pinKey = `appercot:pins:${userId ?? ''}`
  const [pinnedIds, setPinnedIds] = useState(() => readPins(pinKey))
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleChats = chats.filter(
    (chat) =>
      !normalizedQuery ||
      chat.bot.name.toLowerCase().includes(normalizedQuery) ||
      `@${chat.bot.username.toLowerCase()}`.includes(normalizedQuery),
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

  return (
    <div
      className={cn(
        'min-h-0 min-w-0 flex-col border-sidebar-border bg-sidebar pt-[env(safe-area-inset-top)] md:flex md:border-r',
        activeChatId ? 'hidden' : 'flex',
      )}
    >
      <header className="px-4 pt-4 pb-3">
        <h2 className="px-3 pt-3 pb-6 text-xl font-semibold">{strings.chat.title}</h2>
        <search className="block">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            aria-label={strings.chat.search}
            placeholder={strings.chat.search}
          />
        </search>
      </header>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4" aria-label={strings.chat.title}>
        {pinned.length ? (
          <>
            <h3 className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
              {strings.chat.pinned}
            </h3>
            <ul className="mb-3 grid gap-0.5 border-b pb-2">
              {pinned.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeChatId}
                  pinned
                  onPin={() => togglePin(chat.id)}
                />
              ))}
            </ul>
          </>
        ) : null}
        {rest.length ? (
          <ul className="grid gap-0.5">
            {rest.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                pinned={false}
                onPin={() => togglePin(chat.id)}
              />
            ))}
          </ul>
        ) : null}
        {!visibleChats.length ? (
          <div className="px-4 py-10 text-center">
            <p role="status" className="text-sm text-muted-foreground">
              {normalizedQuery ? strings.chat.noSearchResults : strings.chat.noChats}
            </p>
            {normalizedQuery ? (
              <Button variant="link" onClick={() => setQuery('')}>
                {strings.chat.clearSearch}
              </Button>
            ) : null}
          </div>
        ) : null}
      </nav>
    </div>
  )
}
