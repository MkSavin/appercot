import { Bot, LogOut, Search, ShieldCheck, SquarePen } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { logoutRequest } from '@/entities/session'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ChatListItem } from './ChatListItem'

export const Sidebar = ({ activeChatId }: { activeChatId?: string }) => {
  const [, navigate] = useLocation()
  const chats = useChatStore((state) => state.chats)
  const messagesByChat = useChatStore((state) => state.messagesByChat)
  const user = useChatStore((state) => state.user)
  const clearSession = useChatStore((state) => state.clearSession)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleChats = chats.filter(
    (chat) =>
      !normalizedQuery ||
      chat.bot.name.toLowerCase().includes(normalizedQuery) ||
      chat.bot.username.toLowerCase().includes(normalizedQuery),
  )

  const logout = async () => {
    try {
      await logoutRequest()
      clearSession()
      navigate('/login')
    } catch (error) {
      showRequestError(error)
    }
  }

  return (
    <aside
      className={cn(
        'h-dvh min-h-0 min-w-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex',
        activeChatId ? 'hidden' : 'flex',
      )}
      aria-label={strings.chat.title}
    >
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Bot aria-hidden="true" className="size-5" />
          </span>
          <span className="text-lg">{strings.appName}</span>
        </Link>
        <Button asChild variant="ghost" size="icon" className="text-muted-foreground">
          <Link href="/browse" aria-label={strings.chat.browse} title={strings.chat.browse}>
            <SquarePen aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <div className="px-3 pb-3">
        <search>
          <form action="/" method="get" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="chat-search" className="sr-only">
              {strings.chat.search}
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              />
              <Input
                id="chat-search"
                name="query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={strings.chat.search}
                autoComplete="off"
                className="h-10 border-transparent bg-background pl-9 shadow-none"
              />
            </div>
          </form>
        </search>
      </div>
      <nav
        className="min-h-0 min-w-0 flex-1 overflow-y-auto px-2 pb-4"
        aria-label={strings.chat.title}
      >
        {visibleChats.length > 0 ? (
          <ul className="grid min-w-0 gap-0.5">
            {visibleChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                preview={messagesByChat[chat.id]?.at(-1)?.content.text}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {normalizedQuery ? strings.chat.noSearchResults : strings.chat.noChats}
          </p>
        )}
      </nav>
      <div className="flex items-center gap-3 border-t border-sidebar-border p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
          {user?.displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user?.displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">@{user?.username}</span>
        </span>
        {user?.isAdmin ? (
          <Button asChild variant="ghost" size="icon" className="text-muted-foreground">
            <Link href="/admin" aria-label={strings.admin.open} title={strings.admin.open}>
              <ShieldCheck aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-label={strings.chat.logout}
          title={strings.chat.logout}
          onClick={logout}
        >
          <LogOut aria-hidden="true" />
        </Button>
      </div>
    </aside>
  )
}
