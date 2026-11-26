import { ArrowLeft, LoaderCircle, MessageSquareText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'wouter'
import { addBotRequest, BotAvatar, browseBotRequest, type CatalogBotDetails } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { getRequestErrorCode } from '@/shared/api'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { WorkspaceHeader } from '@/shared/ui/workspace-header'

type LoadState =
  | { status: 'loading' }
  | { status: 'failed' | 'not-found' }
  | { status: 'ready'; details: CatalogBotDetails }

export const BotCatalogDetails = ({
  botId,
  catalogSearch = '',
}: {
  botId: string
  catalogSearch?: string
}) => {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const userId = useChatStore((state) => state.user?.id)
  const chatId = useChatStore((state) => state.chats.find((chat) => chat.bot.id === botId)?.id)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [adding, setAdding] = useState(false)
  const [addFailed, setAddFailed] = useState(false)
  const addInFlight = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: The attempt counter restarts the request on retry.
  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    setAddFailed(false)
    browseBotRequest(botId)
      .then((details) => {
        if (active && useChatStore.getState().user?.id === userId)
          setState({ status: 'ready', details })
      })
      .catch((error) => {
        if (!active || useChatStore.getState().user?.id !== userId) return
        setState({ status: getRequestErrorCode(error) === 'NOT_FOUND' ? 'not-found' : 'failed' })
      })
    return () => {
      active = false
    }
  }, [attempt, botId, userId])

  const startChat = async (username: string) => {
    if (addInFlight.current) return
    addInFlight.current = true
    setAdding(true)
    setAddFailed(false)
    const requestUserId = useChatStore.getState().user?.id
    try {
      const chat = await addBotRequest(username)
      const store = useChatStore.getState()
      if (!requestUserId || store.user?.id !== requestUserId) return
      store.upsertChat(chat)
      navigate(`/c/${chat.id}`)
    } catch {
      if (useChatStore.getState().user?.id === requestUserId) setAddFailed(true)
    } finally {
      addInFlight.current = false
      setAdding(false)
    }
  }

  const back = (
    <Button asChild variant="ghost" size="icon" className="size-11 md:size-9">
      <Link
        {...testId(testIds.catalog.details.back)}
        href={`/browse${catalogSearch}`}
        aria-label={t('browse:details.back')}
      >
        <ArrowLeft aria-hidden="true" />
      </Link>
    </Button>
  )
  if (state.status === 'loading')
    return (
      <section>
        <WorkspaceHeader before={back}>{t('browse:details.title')}</WorkspaceHeader>
        <div className="mx-auto max-w-3xl p-4 md:p-7">
          <PagePlaceholder variant="profile" />
        </div>
      </section>
    )
  if (state.status !== 'ready')
    return (
      <section>
        <WorkspaceHeader before={back}>{t('browse:details.title')}</WorkspaceHeader>
        <div className="mx-auto grid max-w-lg justify-items-center gap-4 p-8 text-center">
          <p role="alert">
            {state.status === 'not-found'
              ? t('browse:details.notFound')
              : t('browse:details.failed')}
          </p>
          {state.status === 'failed' ? (
            <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
              {t('common:retry')}
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/browse${catalogSearch}`}>{t('browse:details.back')}</Link>
            </Button>
          )}
        </div>
      </section>
    )

  const { bot, commands } = state.details
  return (
    <section>
      <WorkspaceHeader className="pt-[env(safe-area-inset-top)]" before={back}>
        <span className="min-w-0 truncate">{bot.name}</span>
      </WorkspaceHeader>
      <div className="mx-auto grid max-w-3xl gap-5 p-4 md:p-7">
        <div className="settings-card grid justify-items-center gap-3 py-7 text-center">
          <BotAvatar bot={bot} size="xl" showPresence />
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-semibold">{bot.name}</h2>
            <p className="text-sm text-muted-foreground">@{bot.username}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">
              {bot.online ? t('chat:online') : t('chat:offlineStatus')}
            </Badge>
            <Badge variant="outline">{t('browse:details.publicAccess')}</Badge>
          </div>
          {bot.description ? (
            <p className="max-w-xl whitespace-pre-wrap break-words text-sm leading-6">
              {bot.description}
            </p>
          ) : null}
          {bot.tags?.length ? (
            <div className="flex flex-wrap justify-center gap-1.5">
              {bot.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          {chatId ? (
            <Button asChild size="lg" className="mt-2 min-h-11">
              <Link {...testId(testIds.catalog.details.start)} href={`/c/${chatId}`}>
                <MessageSquareText aria-hidden="true" />
                {t('browse:details.openChat')}
              </Link>
            </Button>
          ) : (
            <Button
              {...testId(testIds.catalog.details.start)}
              size="lg"
              className="mt-2 min-h-11"
              disabled={adding}
              onClick={() => void startChat(bot.username)}
            >
              {adding ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              {adding ? t('browse:details.starting') : t('browse:details.startChat')}
            </Button>
          )}
          {addFailed ? (
            <p role="alert" className="text-sm text-destructive">
              {t('browse:details.addFailed')}
            </p>
          ) : null}
        </div>
        {bot.welcome ? (
          <section className="settings-card grid gap-2">
            <h3 className="font-semibold">{t('browse:details.welcome')}</h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
              {bot.welcome}
            </p>
          </section>
        ) : null}
        <section className="settings-card grid gap-3">
          <h3 className="font-semibold">{t('browse:details.commands')}</h3>
          {commands.length ? (
            <ul className="grid gap-3">
              {commands.map((command) => (
                <li key={command.name} className="grid gap-1 border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-medium">/{command.name}</code>
                    {command.shortcut ? (
                      <Badge variant="secondary">{command.shortcut}</Badge>
                    ) : null}
                  </div>
                  <p className="break-words text-sm leading-6 text-muted-foreground">
                    {command.description}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('browse:details.noCommands')}</p>
          )}
        </section>
      </div>
    </section>
  )
}
