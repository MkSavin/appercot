import { Copy, Link2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { inviteBotMemberRequest, issueBotInviteRequest } from '@/entities/bot'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { ChoiceCards } from '@/shared/ui/choice-cards'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import {
  InviteLimits,
  InviteRoleChoices,
  readBotInviteRole,
  readInviteLimits,
} from '@/shared/ui/invite-fields'

const options = [
  {
    value: 'link',
    label: strings.settings.botLink,
    description: strings.settings.botLinkHint,
    icon: Link2,
  },
  {
    value: 'direct',
    label: strings.settings.byUsername,
    description: strings.settings.byUsernameDescription,
    icon: UserPlus,
  },
] as const

export const InviteBotMemberDialog = ({
  botId,
  availableRoles,
  onInvited,
  onLinkIssued,
}: {
  botId: string
  availableRoles: React.ComponentProps<typeof InviteRoleChoices>['options']
  onInvited: () => void
  onLinkIssued: (link: Awaited<ReturnType<typeof issueBotInviteRequest>>) => void
}) => {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'link' | 'direct'>('link')
  const [pending, setPending] = useState(false)
  const [issued, setIssued] = useState<{ url: string; expiresAt: number | null }>()
  const [copied, setCopied] = useState(false)
  const close = () => {
    setOpen(false)
    setMode('link')
    setIssued(undefined)
    setCopied(false)
  }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const roles = readBotInviteRole(data)
    setPending(true)
    try {
      if (mode === 'link') {
        const link = await issueBotInviteRequest(botId, roles, readInviteLimits(data))
        onLinkIssued(link)
        if (link.url) setIssued({ url: link.url, expiresAt: link.expiresAt })
      } else {
        const username = String(data.get('username')).trim().replace(/^@/, '')
        await inviteBotMemberRequest(botId, username, roles)
        close()
        onInvited()
      }
    } catch (error) {
      showRequestError(error)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (pending) return
        if (value) setOpen(true)
        else close()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden="true" />
          {strings.settings.inviteMember}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{strings.settings.inviteMember}</DialogTitle>
          <DialogDescription>{strings.settings.inviteMemberDescription}</DialogDescription>
        </DialogHeader>
        {issued ? (
          <div className="grid gap-3">
            <label htmlFor="issued-link" className="text-sm font-medium">
              {strings.settings.botLink}
            </label>
            <Input
              id="issued-link"
              readOnly
              value={issued.url}
              onFocus={(event) => event.currentTarget.select()}
            />
            {issued.expiresAt ? (
              <time
                className="text-xs text-muted-foreground"
                dateTime={new Date(issued.expiresAt).toISOString()}
              >
                {strings.settings.expires} {new Date(issued.expiresAt).toLocaleDateString('ru')}
              </time>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{strings.admin.close}</Button>
              </DialogClose>
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(issued.url)
                    setCopied(true)
                  } catch (error) {
                    showRequestError(error)
                  }
                }}
              >
                <Copy aria-hidden="true" />
                {copied ? strings.message.copied : strings.admin.copyLink}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={submit}>
            <ChoiceCards
              name="invite-mode"
              label={strings.settings.inviteMethod}
              value={mode}
              onChange={setMode}
              options={options}
              disabled={pending}
            />
            {mode === 'direct' ? (
              <div className="grid gap-2">
                <label htmlFor="member-username" className="text-sm font-medium">
                  {strings.auth.username}
                </label>
                <Input
                  id="member-username"
                  name="username"
                  placeholder="@username"
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
            ) : null}
            <InviteRoleChoices options={availableRoles} key={mode} />
            {mode === 'link' ? <InviteLimits initialDays={7} /> : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  {strings.chat.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {mode === 'link' ? strings.settings.newBotLink : strings.settings.inviteMember}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
