import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearch } from 'wouter'
import { addBotRequest, type BotDetails, browseBotsRequest } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { showRequestError } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { ContextPanel } from '@/shared/ui/context-panel'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { SearchInput } from '@/shared/ui/search-input'
import { WorkspaceHeader } from '@/shared/ui/workspace-header'
import { BotCatalog } from '@/widgets/bot-catalog'
import { BotInvitationCard } from './BotInvitationCard'

export const BrowsePage = () => {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const params = new URLSearchParams(useSearch())
  const invitedBot = params.get('bot')
  const invite = params.get('invite')
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
  }, [attempt])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleBots = bots.filter(
    (bot) =>
      !normalizedQuery ||
      bot.name.toLowerCase().includes(normalizedQuery) ||
      `@${bot.username.toLowerCase()}`.includes(normalizedQuery) ||
      bot.description.toLowerCase().includes(normalizedQuery) ||
      bot.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery)),
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
      <ContextPanel
        title={t('browse:title')}
        className="flex"
        contentClassName="px-4"
        search={
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            aria-label={t('browse:search')}
            placeholder={t('browse:search')}
          />
        }
      >
        <p className="px-3 text-sm leading-6 text-muted-foreground">{t('browse:subtitle')}</p>
      </ContextPanel>
      <main className="min-h-0 min-w-0 overflow-auto">
        <WorkspaceHeader>{t('browse:all')}</WorkspaceHeader>
        <div className="mx-auto max-w-6xl px-4 py-5 md:px-7">
          {invitedBot && invite ? (
            <BotInvitationCard
              username={invitedBot}
              pending={pendingBotId !== undefined}
              failed={inviteFailed}
              onAccept={() => void acceptInvite(invitedBot, invite)}
            />
          ) : null}
          {loading ? (
            <PagePlaceholder variant="cards" />
          ) : failed ? (
            <div className="grid justify-items-center gap-4 rounded-2xl border bg-card p-8 text-center">
              <p role="alert">{t('browse:failed')}</p>
              <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                {t('chat:retry')}
              </Button>
            </div>
          ) : visibleBots.length === 0 ? (
            <div className="grid justify-items-center gap-3 rounded-2xl border bg-card p-8 text-center">
              <p role="status" className="text-muted-foreground">
                {normalizedQuery ? t('chat:noSearchResults') : t('browse:empty')}
              </p>
              {normalizedQuery ? (
                <Button variant="outline" onClick={() => setQuery('')}>
                  {t('chat:clearSearch')}
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
