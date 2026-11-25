import { ChevronRight, Plus, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { BotAvatar, type IssuedBotToken, type ManagedBot } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import {
  CreateBotDialog,
  FirstBotChecklist,
  readOnboardingDismissed,
  useBotDiagnostics,
  writeOnboardingDismissed,
} from '@/features/bot-onboarding'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

export const AdminBotsSection = ({
  bots,
  onToken,
}: {
  bots: ManagedBot[]
  onToken: (token: IssuedBotToken) => void
}) => {
  const { t } = useTranslation()
  const userId = useChatStore((state) => state.user?.id)
  const webSocketUrl = useChatStore((state) => state.botWebSocketUrl)
  const [createOpen, setCreateOpen] = useState(false)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const [selectedBotId, setSelectedBotId] = useState<string>()
  const [onlineByBotId, setOnlineByBotId] = useState<Record<string, boolean>>({})
  const [checklistWaiting, setChecklistWaiting] = useState(false)
  const [dismissed, setDismissed] = useState(() =>
    userId ? readOnboardingDismissed(userId) : false,
  )
  const selectedBot = bots.find((bot) => bot.id === selectedBotId) ?? bots[0]
  const { diagnostics, failed, retry } = useBotDiagnostics(
    selectedBot?.id,
    Boolean(selectedBot && (createOpen || checklistWaiting)) && !dismissed,
  )
  const online = selectedBot
    ? (diagnostics?.online ?? onlineByBotId[selectedBot.id] ?? selectedBot.online)
    : false

  useEffect(() => {
    if (selectedBot && diagnostics)
      setOnlineByBotId((current) =>
        current[selectedBot.id] === diagnostics.online
          ? current
          : { ...current, [selectedBot.id]: diagnostics.online },
      )
    if (online) setChecklistWaiting(false)
  }, [diagnostics, online, selectedBot])

  if (!userId) return null
  const changeDismissed = (value: boolean) => {
    writeOnboardingDismissed(userId, value)
    setDismissed(value)
    if (value) setChecklistWaiting(false)
  }
  const changeDialogOpen = (open: boolean) => {
    if (open && document.activeElement instanceof HTMLElement)
      returnFocusTo.current = document.activeElement
    setCreateOpen(open)
    if (!open) setChecklistWaiting(false)
  }
  const checkAgain = () => {
    setChecklistWaiting(true)
    retry()
  }

  return (
    <section aria-label={t('admin:bots')} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('admin:botsDescription')}</p>
        <Button
          {...testId(testIds.onboarding.create)}
          className="min-h-11"
          onClick={() => changeDialogOpen(true)}
        >
          <Plus aria-hidden="true" />
          {t('admin:createBot')}
        </Button>
      </div>
      {dismissed ? (
        <Button
          {...testId(testIds.onboarding.show)}
          type="button"
          variant="link"
          className="min-h-11 justify-self-start px-0"
          onClick={() => changeDismissed(false)}
        >
          {t('onboarding:show')}
        </Button>
      ) : (
        <FirstBotChecklist
          bot={selectedBot}
          diagnostics={diagnostics}
          diagnosticsFailed={failed}
          online={online}
          onCreate={() => changeDialogOpen(true)}
          onRetry={checkAgain}
          onDismiss={() => changeDismissed(true)}
          onFinished={() => changeDismissed(true)}
        />
      )}
      {bots.length ? (
        <ul className="grid gap-2">
          {bots.map((bot) => {
            const botOnline = bot.id === selectedBot?.id ? online : bot.online
            return (
              <li key={bot.id}>
                <Link
                  href={`/settings/bots/${bot.id}`}
                  className="grid min-w-0 grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-card p-3 transition-colors hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-ring sm:gap-4 sm:px-4"
                >
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <BotAvatar bot={bot} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{bot.name}</p>
                      <p className="truncate text-xs text-muted-foreground">@{bot.username}</p>
                    </div>
                  </div>
                  <div className="grid justify-items-start gap-1 text-xs text-muted-foreground">
                    <Badge variant={botOnline ? 'default' : 'outline'} className="rounded-full">
                      {botOnline ? t('settings:botOnline') : t('settings:botOffline')}
                    </Badge>
                    <span className="inline-flex items-center gap-1">
                      <Users aria-hidden="true" className="size-3" />
                      <span className="sr-only">{t('bot:membersCount')}</span>
                      {bot.memberCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      {bot.access === 'by_link' ? t('settings:byLink') : t('settings:public')}
                    </Badge>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
      <CreateBotDialog
        open={createOpen}
        onOpenChange={changeDialogOpen}
        onCreated={(issued) => {
          setSelectedBotId(issued.bot.id)
          setChecklistWaiting(false)
          onToken(issued)
        }}
        webSocketUrl={webSocketUrl ?? ''}
        diagnostics={diagnostics}
        diagnosticsFailed={failed}
        onRetry={retry}
        onFinished={() => setChecklistWaiting(false)}
        returnFocusTo={returnFocusTo}
      />
    </section>
  )
}
