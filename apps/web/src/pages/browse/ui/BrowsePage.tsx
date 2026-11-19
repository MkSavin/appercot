import { Grid2X2, Link2, MessagesSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearch } from 'wouter'
import { addBotRequest, type BotDetails, browseBotsRequest } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { SearchInput } from '@/shared/ui/search-input'
import { BotCatalog } from '@/widgets/bot-catalog'

export const BrowsePage = () => {
  const [, navigate] = useLocation()
  const params = new URLSearchParams(useSearch())
  const invitedBot = params.get('bot')
  const invite = params.get('invite')
  const installed = params.get('view') === 'installed'
  const chats = useChatStore((state) => state.chats)
  const upsertChat = useChatStore((state) => state.upsertChat)
  const [bots, setBots] = useState<BotDetails[]>([])
  const [query, setQuery] = useState('')
  const [pendingBotId, setPendingBotId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [inviteFailed, setInviteFailed] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: The attempt counter restarts the request on retry.
  useEffect(() => {
    if (installed) return
    let active = true
    setLoading(true)
    setFailed(false)
    browseBotsRequest()
      .then((nextBots) => {
        if (active) setBots(nextBots)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [attempt, installed])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleBots = (installed ? chats.map((chat) => chat.bot) : bots).filter(
    (bot) =>
      !normalizedQuery ||
      bot.name.toLowerCase().includes(normalizedQuery) ||
      `@${bot.username.toLowerCase()}`.includes(normalizedQuery) ||
      bot.description.toLowerCase().includes(normalizedQuery),
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

  const acceptInvite = async (username: string, code: string) => {
    setPendingBotId(username)
    setInviteFailed(false)
    try {
      const chat = await addBotRequest(username, code)
      upsertChat(chat)
      navigate(`/c/${chat.id}`, { replace: true })
    } catch {
      setInviteFailed(true)
    } finally {
      setPendingBotId(undefined)
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[var(--context-width)_minmax(0,1fr)] md:grid-rows-1">
      <nav
        aria-label={strings.browse.title}
        className="flex gap-1 border-b border-sidebar-border bg-sidebar md:block md:border-r md:border-b-0"
      >
        <header className="px-4 pt-4">
          <h2 className="px-3 pt-3 pb-6 text-xl font-semibold">{strings.browse.title}</h2>
        </header>

        <div className="flex gap-1 px-4 md:block">
          <Link
            href="/browse"
            aria-current={!installed ? 'page' : undefined}
            className="workspace-link flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium"
          >
            <Grid2X2 aria-hidden="true" className="size-4" />
            {strings.browse.all}
          </Link>
          <Link
            href="/browse?view=installed"
            aria-current={installed ? 'page' : undefined}
            className="workspace-link flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium"
          >
            <MessagesSquare aria-hidden="true" className="size-4" />
            {strings.browse.installed}
          </Link>
        </div>
      </nav>
      <main className="min-h-0 min-w-0 overflow-auto">
        <header className="flex min-h-16 items-center border-b bg-card px-4 md:px-7">
          <h1 className="text-lg font-semibold">
            {installed ? strings.browse.installed : strings.browse.all}
          </h1>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-5 md:px-7">
          {invitedBot && invite ? (
            <section className="settings-card mb-5 grid justify-items-start gap-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <Link2 aria-hidden="true" className="size-4" />
                {strings.browse.joinInvitation}
              </h2>
              <p className="text-sm font-medium">@{invitedBot}</p>
              <p className="text-sm text-muted-foreground">{strings.browse.invitationHint}</p>
              {inviteFailed ? (
                <p role="alert" className="text-sm text-destructive">
                  {strings.browse.invitationFailed}
                </p>
              ) : null}
              <Button
                disabled={pendingBotId !== undefined}
                onClick={() => void acceptInvite(invitedBot, invite)}
              >
                {strings.browse.open}
              </Button>
            </section>
          ) : null}
          {!failed || installed ? (
            <search className="mb-6 block max-w-lg">
              <SearchInput
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                aria-label={strings.browse.search}
                placeholder={strings.browse.search}
              />
            </search>
          ) : null}
          {!installed && loading ? (
            <p role="status" className="py-16 text-center text-muted-foreground">
              {strings.browse.loading}
            </p>
          ) : !installed && failed ? (
            <div className="grid justify-items-center gap-4 rounded-2xl border bg-card p-8 text-center">
              <p role="alert">{strings.browse.failed}</p>
              <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                {strings.chat.retry}
              </Button>
            </div>
          ) : visibleBots.length === 0 ? (
            <div className="grid justify-items-center gap-3 rounded-2xl border bg-card p-8 text-center">
              <p role="status" className="text-muted-foreground">
                {normalizedQuery
                  ? strings.chat.noSearchResults
                  : installed
                    ? strings.chat.noChats
                    : strings.browse.empty}
              </p>
              {normalizedQuery ? (
                <Button variant="outline" onClick={() => setQuery('')}>
                  {strings.chat.clearSearch}
                </Button>
              ) : null}
            </div>
          ) : (
            <BotCatalog
              bots={visibleBots}
              chatByBotId={chatByBotId}
              pendingBotId={pendingBotId}
              onAdd={addBot}
            />
          )}
        </div>
      </main>
    </div>
  )
}
