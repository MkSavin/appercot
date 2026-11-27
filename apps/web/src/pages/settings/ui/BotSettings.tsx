import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BotAvatar,
  fetchAdminBot,
  fetchBotInvitations,
  fetchBotMemberships,
  type IssuedBotToken,
} from '@/entities/bot'
import { BotSetupDialog } from '@/features/bot-onboarding'
import { BotMembersPanel, InviteBotMemberDialog } from '@/features/bot-token-manage'
import { showRequestError } from '@/shared/api'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { BotProfileEditor } from './BotProfileEditor'
import { BotAccessSettings } from './bot-settings/BotAccessSettings'
import { BotConnectionSettings } from './bot-settings/BotConnectionSettings'
import { BotDangerZone } from './bot-settings/BotDangerZone'
import { BotInvitationsSection } from './bot-settings/BotInvitationsSection'
import { BotOwnerSettings } from './bot-settings/BotOwnerSettings'
import { BotRolesList } from './bot-settings/BotRolesList'

export const BotSettings = ({ botId, isOwner }: { botId: string; isOwner: boolean }) => {
  const { t } = useTranslation()
  const [bot, setBot] = useState<Awaited<ReturnType<typeof fetchAdminBot>>>()
  const [memberships, setMemberships] = useState<Awaited<ReturnType<typeof fetchBotMemberships>>>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [pending, setPending] = useState(false)
  const [issued, setIssued] = useState<IssuedBotToken>()
  const [links, setLinks] = useState<Awaited<ReturnType<typeof fetchBotInvitations>>>([])
  useEffect(() => {
    if (status !== 'loading') return
    let active = true
    Promise.all([fetchAdminBot(botId), fetchBotMemberships(botId), fetchBotInvitations(botId)])
      .then(([nextBot, nextMemberships, nextLinks]) => {
        if (!active) return
        setBot(nextBot)
        setMemberships(nextMemberships)
        setLinks(nextLinks)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('failed')
      })
    return () => {
      active = false
    }
  }, [botId, status])

  const run = async (operation: () => Promise<void>) => {
    setPending(true)
    try {
      await operation()
    } catch (error) {
      showRequestError(error)
    } finally {
      setPending(false)
    }
  }

  if (status === 'failed')
    return (
      <div className="settings-card grid justify-items-start gap-3">
        <p role="alert">{t('admin:failed')}</p>
        <Button onClick={() => setStatus('loading')}>{t('chat:retry')}</Button>
      </div>
    )
  if (!bot || !memberships) return <PagePlaceholder variant="bot-settings" />

  return (
    <div className="grid gap-8">
      <section className="settings-card flex items-start gap-3">
        <BotAvatar bot={bot} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{bot.name}</h2>
            <Badge variant={bot.stopped ? 'destructive' : 'secondary'}>
              {bot.stopped
                ? t('settings:botStopped')
                : bot.online
                  ? t('settings:botOnline')
                  : t('settings:botOffline')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">@{bot.username}</p>
        </div>
      </section>
      <BotProfileEditor
        bot={bot}
        onSave={(profile) => setBot((current) => current && { ...current, ...profile })}
      />
      <BotAccessSettings bot={bot} pending={pending} run={run} onChange={setBot} />
      <BotRolesList memberships={memberships} />
      <section aria-labelledby="bot-members-title" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="bot-members-title" className="text-base font-semibold">
            {t('settings:botMembers')}
          </h2>
          <InviteBotMemberDialog
            botId={botId}
            availableRoles={memberships.roleDefinitions}
            onLinkIssued={(link) => setLinks((current) => [link, ...current])}
            onInvited={() => {
              void run(async () => setMemberships(await fetchBotMemberships(botId)))
            }}
          />
        </div>
        <BotMembersPanel botId={botId} data={memberships} />
      </section>
      <BotInvitationsSection
        botId={botId}
        memberships={memberships}
        links={links}
        onChange={setLinks}
      />
      <BotConnectionSettings
        bot={bot}
        pending={pending}
        run={run}
        onBotChange={setBot}
        onIssued={setIssued}
      />
      {isOwner ? (
        <BotOwnerSettings
          bot={bot}
          pending={pending}
          run={run}
          onBotChange={setBot}
          onLinksChange={setLinks}
        />
      ) : null}
      <BotDangerZone bot={bot} pending={pending} run={run} onBotChange={setBot} />
      {issued ? (
        <BotSetupDialog key={issued.token} issued={issued} onClose={() => setIssued(undefined)} />
      ) : null}
    </div>
  )
}
