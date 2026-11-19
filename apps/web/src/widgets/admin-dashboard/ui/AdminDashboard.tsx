import { ChevronRight, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'wouter'
import { BotAvatar, type IssuedBotToken, type ManagedBot } from '@/entities/bot'
import type { SessionUser } from '@/entities/chat'
import { useRegistrationPolicy } from '@/entities/session'
import { type AdminInvite, editPlatformInvite, revokePlatformInvite } from '@/entities/user'
import { CreateBotDialog } from '@/features/bot-token-manage'
import { CreateInviteForm } from '@/features/create-invite'

import { strings } from '@/shared/config'
import { Badge } from '@/shared/ui/badge'
import { InvitationList } from '@/shared/ui/invitation-list'
import { PlatformInviteRole } from '@/shared/ui/invite-fields'
import { SearchInput } from '@/shared/ui/search-input'

interface AdminDashboardProps {
  section: 'users' | 'invites' | 'bots'
  users: SessionUser[]
  invites: AdminInvite[]
  bots: ManagedBot[]
  onInviteCreated: (invite: AdminInvite) => void

  onToken: (token: IssuedBotToken) => void
}

export const AdminDashboard = ({
  section,
  users,
  invites,
  bots,
  onInviteCreated,

  onToken,
}: AdminDashboardProps) => {
  const policy = useRegistrationPolicy()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const visibleUsers = users.filter(
    (user) =>
      !normalizedQuery ||
      user.username.toLowerCase().includes(normalizedQuery) ||
      user.displayName.toLowerCase().includes(normalizedQuery),
  )

  return (
    <div className="grid gap-5">
      {section === 'users' ? (
        <section aria-label={strings.admin.users} className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <search className="min-w-40 flex-1">
              <SearchInput
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                aria-label={strings.admin.searchUsers}
                placeholder={strings.admin.searchUsers}
              />
            </search>
            {policy?.invitations ? <CreateInviteForm single onCreated={onInviteCreated} /> : null}
          </div>
          {visibleUsers.length ? (
            <ul className="overflow-hidden rounded-xl border bg-card">
              {visibleUsers.map((user) => (
                <li key={user.id} className="border-b last:border-0">
                  <Link
                    href={`/settings/users/${user.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{user.displayName}</p>
                      <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    <Badge variant="outline">{strings.settings.roles[user.role]}</Badge>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              {strings.chat.noSearchResults}
            </p>
          )}
        </section>
      ) : null}

      {section === 'invites' ? (
        <section aria-label={strings.admin.invites} className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{strings.admin.invitesDescription}</p>
            {policy?.invitations ? (
              <CreateInviteForm onCreated={onInviteCreated} />
            ) : (
              <p className="text-sm text-muted-foreground">{strings.admin.invitesDisabled}</p>
            )}
          </div>
          <InvitationList
            rows={invites.map((invite) => ({
              ...invite,
              id: invite.code,
              roles: [strings.settings.roles[invite.role]],
            }))}
            editable={policy?.invitations ?? false}
            roleFields={(row) => <PlatformInviteRole value={row.role} />}
            onEdit={async (row, data, limits) => {
              onInviteCreated(
                await editPlatformInvite(row.code, {
                  ...limits,
                  role: data.get('role') === 'admin' ? 'admin' : 'user',
                }),
              )
            }}
            onRevoke={async (row) => {
              await revokePlatformInvite(row.code)
              onInviteCreated({ ...row, revokedAt: Date.now() })
            }}
          />
        </section>
      ) : null}

      {section === 'bots' ? (
        <section aria-label={strings.admin.bots} className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{strings.admin.botsDescription}</p>
            <CreateBotDialog onCreated={onToken} />
          </div>
          {bots.length ? (
            <ul className="grid gap-2">
              {bots.map((bot) => (
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
                      <Badge variant={bot.online ? 'default' : 'outline'} className="rounded-full">
                        {bot.online ? strings.settings.botOnline : strings.settings.botOffline}
                      </Badge>
                      <span className="inline-flex items-center gap-1">
                        <Users aria-hidden="true" className="size-3" />
                        <span className="sr-only">Участников</span>
                        {bot.memberCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {bot.access === 'by_link'
                          ? strings.settings.byLink
                          : strings.settings.public}
                      </Badge>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{strings.browse.empty}</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
