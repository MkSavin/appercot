import { Pencil } from 'lucide-react'
import { useState } from 'react'
import {
  type fetchBotMemberships,
  setBotMemberRevokedRequest,
  setBotMemberRolesRequest,
} from '@/entities/bot'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
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
import { InviteRoleChoices, readBotInviteRole } from '@/shared/ui/invite-fields'

type Memberships = Awaited<ReturnType<typeof fetchBotMemberships>>
type Member = Memberships['members'][number]

export const BotMembersPanel = ({ botId, data }: { botId: string; data: Memberships }) => {
  if (!data.members.length)
    return <p className="text-sm text-muted-foreground">{strings.settings.noBotMembers}</p>
  return (
    <ul className="grid gap-2">
      {data.members.map((member) => (
        <MemberRow
          key={JSON.stringify([member.chatId, member.revoked, member.roles])}
          botId={botId}
          member={member}
          availableRoles={data.roleDefinitions}
        />
      ))}
    </ul>
  )
}

const MemberRow = ({
  botId,
  member,
  availableRoles,
}: {
  botId: string
  member: Member
  availableRoles: Memberships['roleDefinitions']
}) => {
  const [roles, setRoles] = useState(member.roles)
  const [revoked, setRevoked] = useState(member.revoked)
  const [pending, setPending] = useState(false)
  const [editing, setEditing] = useState(false)
  const role = availableRoles.find(({ code }) => code === roles[0])
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
  return (
    <li className="settings-card flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
      </div>
      {revoked ? (
        <Badge variant="outline">{strings.settings.memberRevoked}</Badge>
      ) : (
        <Badge variant="secondary">{role?.name ?? 'Без роли'}</Badge>
      )}
      {!revoked && !role?.virtual && availableRoles.some((item) => !item.virtual) ? (
        <Dialog
          open={editing}
          onOpenChange={(open) => {
            if (!pending) setEditing(open)
          }}
        >
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Изменить роль @${member.username}`}>
              <Pencil aria-hidden="true" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Изменить роль</DialogTitle>
              <DialogDescription>@{member.username}</DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                const next = readBotInviteRole(new FormData(event.currentTarget))
                void run(async () => {
                  await setBotMemberRolesRequest(botId, member.chatId, next)
                  setRoles(next)
                  setEditing(false)
                })
              }}
            >
              <InviteRoleChoices options={availableRoles} selected={roles} emptyLabel="Без роли" />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button" disabled={pending}>
                    Отмена
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={pending}>
                  Сохранить
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
      {!role?.virtual ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            void run(async () => {
              await setBotMemberRevokedRequest(botId, member.chatId, !revoked)
              setRevoked(!revoked)
            })
          }
        >
          {revoked ? strings.settings.restoreMember : strings.settings.revokeMember}
        </Button>
      ) : null}
    </li>
  )
}
