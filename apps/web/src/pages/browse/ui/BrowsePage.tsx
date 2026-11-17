import { ArrowLeft, Bot, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { addBotRequest, type BotDetails, browseBotsRequest } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { BotCatalog } from '@/widgets/bot-catalog'

export const BrowsePage = () => {
  const [, navigate] = useLocation()
  const chats = useChatStore((state) => state.chats)
  const upsertChat = useChatStore((state) => state.upsertChat)
  const [bots, setBots] = useState<BotDetails[]>([])
  const [query, setQuery] = useState('')
  const [pendingBotId, setPendingBotId] = useState<string>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    browseBotsRequest()
      .then((nextBots) => {
        if (active) setBots(nextBots)
      })
      .catch(showRequestError)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleBots = bots.filter(
    (bot) =>
      !normalizedQuery ||
      bot.name.toLowerCase().includes(normalizedQuery) ||
      bot.username.toLowerCase().includes(normalizedQuery),
  )
  const chatByBotId = Object.fromEntries(chats.map((chat) => [chat.bot.id, chat.id]))

  const addBot = async (bot: BotDetails) => {
    setPendingBotId(bot.id)
    try {
      const chat = await addBotRequest(bot.username)
      upsertChat(chat)
      navigate(`/c/${chat.id}`)
    } catch (error) {
      showRequestError(error)
    } finally {
      setPendingBotId(undefined)
    }
  }

  return (
    <main className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            {strings.chat.back}
          </Link>
        </Button>
        <header className="mb-6 flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary">
            <Bot aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{strings.browse.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{strings.browse.subtitle}</p>
          </div>
        </header>
        <search className="mb-6 block">
          <form action="/browse" method="get" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="bot-search" className="sr-only">
              {strings.browse.search}
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              />
              <Input
                id="bot-search"
                name="query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={strings.browse.search}
                autoComplete="off"
                className="h-11 pl-9"
              />
            </div>
          </form>
        </search>
        {loading ? (
          <p role="status" className="py-16 text-center text-muted-foreground">
            {strings.browse.loading}
          </p>
        ) : (
          <BotCatalog
            bots={visibleBots}
            chatByBotId={chatByBotId}
            pendingBotId={pendingBotId}
            onAdd={addBot}
            onOpen={(chatId) => navigate(`/c/${chatId}`)}
          />
        )}
      </div>
    </main>
  )
}
