import { KeyRound, LockKeyhole, UnlockKeyhole } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  BotAvatar,
  editBotInviteRequest,
  fetchAdminBot,
  fetchBotInvitations,
  fetchBotMemberships,
  type IssuedBotToken,
  resetBotTokenRequest,
  revokeBotInviteRequest,
  setBotAccessRequest,
  setBotGuestAccessRequest,
  setBotOwnerRequest,
} from '@/entities/bot'
import { BotMembersPanel, BotTokenDialog, InviteBotMemberDialog } from '@/features/bot-token-manage'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ChoiceCards } from '@/shared/ui/choice-cards'
import { Input } from '@/shared/ui/input'
import { InvitationList } from '@/shared/ui/invitation-list'
import { InviteRoleChoices, readBotInviteRole } from '@/shared/ui/invite-fields'
import { BotProfileEditor } from './BotProfileEditor'

const accessChoices = [
  {
    value: 'public',
    label: strings.settings.public,
    description: strings.settings.publicDescription,
    icon: UnlockKeyhole,
  },
  {
    value: 'by_link',
    label: strings.settings.byLink,
    description: strings.settings.byLinkDescription,
    icon: LockKeyhole,
  },
] as const

export const BotSettings = ({ botId, isOwner }: { botId: string; isOwner: boolean }) => {
  const [bot, setBot] = useState<Awaited<ReturnType<typeof fetchAdminBot>>>()
  const [memberships, setMemberships] = useState<Awaited<ReturnType<typeof fetchBotMemberships>>>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [pending, setPending] = useState(false)
  const [issued, setIssued] = useState<IssuedBotToken>()
  const [links, setLinks] = useState<Awaited<ReturnType<typeof fetchBotInvitations>>>([])
  const [ownerChanged, setOwnerChanged] = useState(false)
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
        <p role="alert">{strings.admin.failed}</p>
        <Button onClick={() => setStatus('loading')}>{strings.chat.retry}</Button>
      </div>
    )
  if (!bot || !memberships)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {strings.admin.loading}
      </p>
    )

  return (
    <div className="grid gap-8">
      <section className="settings-card flex items-start gap-3">
        <BotAvatar bot={bot} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{bot.name}</h2>
            <Badge variant="secondary">
              {bot.online ? strings.settings.botOnline : strings.settings.botOffline}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">@{bot.username}</p>
        </div>
      </section>
      <BotProfileEditor
        bot={bot}
        onSave={(profile) => setBot((current) => current && { ...current, ...profile })}
      />
      <section aria-labelledby="bot-access-title" className="grid gap-3">
        <h2 id="bot-access-title" className="text-base font-semibold">
          {strings.settings.botAccess}
        </h2>
        <ChoiceCards
          name="bot-access"
          label={strings.settings.botAccess}
          value={bot.access}
          options={accessChoices}
          disabled={pending}
          className="sm:grid-cols-2"
          onChange={(access) =>
            void run(async () => {
              const changed = await setBotAccessRequest(botId, access)
              setBot({ ...bot, ...changed })
            })
          }
        />
        {bot.access === 'public' ? (
          <div className="settings-card grid gap-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={bot.guestAccess}
                disabled={pending}
                onChange={(event) => {
                  const enabled = event.currentTarget.checked
                  void run(async () =>
                    setBot({ ...bot, ...(await setBotGuestAccessRequest(botId, enabled)) }),
                  )
                }}
              />
              Разрешить гостевой доступ
            </label>
            <p className="text-xs text-muted-foreground">
              Гости смогут запускать команды, которые бот разрешил роли guest.
            </p>
            {bot.guestAccess ? (
              <a
                className="w-fit text-sm text-primary underline"
                href={`/guest/${bot.username}`}
                target="_blank"
                rel="noreferrer"
              >
                Открыть гостевой чат
              </a>
            ) : null}
          </div>
        ) : null}
      </section>
      <section className="grid gap-3">
        <h2 className="text-base font-semibold">Роли бота</h2>
        <ul className="settings-card divide-y py-1">
          {memberships.roleDefinitions.map(({ code, name, virtual }) => (
            <li
              key={code}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                {name}
                {virtual ? <Badge variant="outline">Системная</Badge> : null}
              </span>
              <code className="text-xs text-muted-foreground">{code}</code>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="bot-members-title" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="bot-members-title" className="text-base font-semibold">
            {strings.settings.botMembers}
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
      <section className="grid gap-3">
        <h2 className="text-base font-semibold">Пригласительные ссылки</h2>
        <InvitationList
          rows={links.map((link) => ({
            ...link,
            roles: link.roles.map(
              (code) =>
                memberships.roleDefinitions.find((item) => item.code === code)?.name ?? code,
            ),
            roleCodes: link.roles,
          }))}
          roleFields={(link) => (
            <InviteRoleChoices options={memberships.roleDefinitions} selected={link.roleCodes} />
          )}
          onEdit={async (link, data, limits) => {
            const changed = await editBotInviteRequest(
              botId,
              link.id,
              readBotInviteRole(data),
              limits,
            )
            setLinks((current) => current.map((row) => (row.id === changed.id ? changed : row)))
          }}
          onRevoke={async (link) => {
            await revokeBotInviteRequest(botId, link.id)
            setLinks((current) =>
              current.map((row) => (row.id === link.id ? { ...row, revokedAt: Date.now() } : row)),
            )
          }}
        />
      </section>
      <section aria-labelledby="bot-connection-title" className="grid gap-3">
        <h2 id="bot-connection-title" className="text-base font-semibold">
          {strings.settings.botConnection}
        </h2>
        <div className="settings-card grid justify-items-start gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={pending}>
                <KeyRound aria-hidden="true" />
                {strings.admin.resetToken}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{strings.settings.rotateTokenTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {strings.settings.rotateTokenDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{strings.chat.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    void run(async () => {
                      const token = await resetBotTokenRequest(botId)
                      setIssued(token)
                      setBot({ ...bot, online: token.bot.online })
                    })
                  }
                >
                  {strings.admin.resetToken}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {isOwner ? (
            <form
              className="grid w-full items-start gap-2 border-t pt-4 sm:grid-cols-[minmax(0,1fr)_auto]"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  await setBotOwnerRequest(
                    botId,
                    String(form.get('owner')).trim().replace(/^@/, ''),
                  )
                  setOwnerChanged(true)
                  setBot(await fetchAdminBot(botId))
                  setLinks(await fetchBotInvitations(botId))
                })
              }}
            >
              <label htmlFor="bot-new-owner" className="text-sm font-medium sm:col-span-2">
                {strings.admin.owner}
              </label>
              <Input id="bot-new-owner" name="owner" autoCapitalize="none" spellCheck={false} />
              <Button type="submit" variant="outline" disabled={pending}>
                {strings.admin.saveOwner}
              </Button>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                {strings.settings.transferHint}
              </p>
              {ownerChanged ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {strings.settings.ownerSaved}
                </p>
              ) : null}
            </form>
          ) : null}
        </div>
      </section>
      {issued ? (
        <BotTokenDialog
          open
          token={issued.token}
          botName={issued.bot.name}
          onClose={() => setIssued(undefined)}
        />
      ) : null}
    </div>
  )
}
