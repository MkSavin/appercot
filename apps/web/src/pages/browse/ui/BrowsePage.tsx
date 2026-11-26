import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams, useSearch } from 'wouter'
import { addBotRequest, type BotDetails, browseBotsRequest } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { ContextPanel } from '@/shared/ui/context-panel'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { SearchInput } from '@/shared/ui/search-input'
import { WorkspaceHeader } from '@/shared/ui/workspace-header'
import { BotCatalog, BotCatalogDetails } from '@/widgets/bot-catalog'
import { BotInvitationCard } from './BotInvitationCard'

export const BrowsePage = () => {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const { botId } = useParams<{ botId?: string }>()
  const search = useSearch()
  const params = new URLSearchParams(search)
  const query = params.get('q') ?? ''
  const selectedTag = params.get('tag') ?? undefined
  const invitedBot = params.get('bot')
  const invite = params.get('invite')
  const upsertChat = useChatStore((state) => state.upsertChat)
  const [bots, setBots] = useState<BotDetails[]>([])
  const [invitePending, setInvitePending] = useState(false)
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
  const tags = [...new Set(bots.flatMap((bot) => bot.tags ?? []))].sort((left, right) =>
    left.localeCompare(right),
  )
  const visibleBots = bots.filter(
    (bot) =>
      (!selectedTag || bot.tags?.includes(selectedTag)) &&
      (!normalizedQuery ||
        bot.name.toLowerCase().includes(normalizedQuery) ||
        `@${bot.username.toLowerCase()}`.includes(normalizedQuery) ||
        bot.description.toLowerCase().includes(normalizedQuery) ||
        bot.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery))),
  )

  const updateFilters = (nextQuery: string, nextTag?: string) => {
    const next = new URLSearchParams(search)
    if (nextQuery) next.set('q', nextQuery)
    else next.delete('q')
    if (nextTag) next.set('tag', nextTag)
    else next.delete('tag')
    const suffix = next.toString()
    navigate(`/browse${suffix ? `?${suffix}` : ''}`, { replace: true })
  }
  const catalogParams = new URLSearchParams()
  if (query) catalogParams.set('q', query)
  if (selectedTag) catalogParams.set('tag', selectedTag)
  const catalogSuffix = catalogParams.toString()
  const catalogSearch = catalogSuffix ? `?${catalogSuffix}` : ''

  const acceptInvite = async (username: string, code: string) => {
    setInvitePending(true)
    setInviteFailed(false)
    try {
      const chat = await addBotRequest(username, code)
      upsertChat(chat)
      navigate(`/c/${chat.id}`, { replace: true })
    } catch {
      setInviteFailed(true)
    } finally {
      setInvitePending(false)
    }
  }
  const resetFilters = () => updateFilters('')

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[var(--context-width)_minmax(0,1fr)] md:grid-rows-1">
      <ContextPanel
        title={t('browse:title')}
        className={botId ? 'hidden md:flex' : 'flex'}
        contentClassName="px-4"
        search={
          <SearchInput
            {...testId(testIds.catalog.search)}
            value={query}
            onChange={(event) => updateFilters(event.currentTarget.value, selectedTag)}
            aria-label={t('browse:search')}
            placeholder={t('browse:search')}
          />
        }
      >
        <p className="px-3 text-sm leading-6 text-muted-foreground">{t('browse:subtitle')}</p>
        {tags.length ? (
          <fieldset className="mt-4 grid gap-2 px-3">
            <legend className="text-xs font-medium text-muted-foreground">
              {t('browse:tagFilter')}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              <Button
                {...testId(testIds.catalog.allTags)}
                variant={selectedTag ? 'outline' : 'secondary'}
                size="sm"
                className="min-h-11 md:min-h-8"
                aria-pressed={!selectedTag}
                onClick={() => updateFilters(query)}
              >
                {t('browse:allTags')}
              </Button>
              {tags.map((tag) => (
                <Button
                  {...testId(testIds.catalog.tag(tag))}
                  key={tag}
                  variant={selectedTag === tag ? 'secondary' : 'outline'}
                  size="sm"
                  className="min-h-11 md:min-h-8"
                  aria-pressed={selectedTag === tag}
                  onClick={() => updateFilters(query, selectedTag === tag ? undefined : tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </fieldset>
        ) : null}
      </ContextPanel>
      <main className="min-h-0 min-w-0 overflow-auto">
        {botId ? (
          <BotCatalogDetails key={botId} botId={botId} catalogSearch={catalogSearch} />
        ) : (
          <>
            <WorkspaceHeader>{t('browse:all')}</WorkspaceHeader>
            <div className="mx-auto max-w-6xl px-4 py-5 md:px-7">
              {invitedBot && invite ? (
                <BotInvitationCard
                  username={invitedBot}
                  pending={invitePending}
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
                    {t('common:retry')}
                  </Button>
                </div>
              ) : visibleBots.length === 0 ? (
                <div className="grid justify-items-center gap-3 rounded-2xl border bg-card p-8 text-center">
                  <p role="status" className="text-muted-foreground">
                    {normalizedQuery || selectedTag
                      ? t('browse:noFilterResults')
                      : t('browse:empty')}
                  </p>
                  {normalizedQuery || selectedTag ? (
                    <Button variant="outline" onClick={resetFilters}>
                      {t('browse:resetFilters')}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <BotCatalog bots={visibleBots} returnSearch={catalogSearch} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
