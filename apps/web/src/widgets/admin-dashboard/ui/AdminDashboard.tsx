import { Copy, Search } from 'lucide-react'
import { useState } from 'react'
import type { BotDetails, IssuedBotToken } from '@/entities/bot'
import type { SessionUser } from '@/entities/chat'
import type { AdminInvite } from '@/entities/user'
import { BotManager } from '@/features/bot-token-manage'
import { CreateInviteForm } from '@/features/create-invite'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

interface AdminDashboardProps {
  users: SessionUser[]
  invites: AdminInvite[]
  bots: BotDetails[]
  onInviteCreated: (invite: AdminInvite) => void
  onBotChanged: (bot: BotDetails) => void
  onToken: (token: IssuedBotToken) => void
}

export const AdminDashboard = ({
  users,
  invites,
  bots,
  onInviteCreated,
  onBotChanged,
  onToken,
}: AdminDashboardProps) => {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleUsers = users.filter(
    (user) =>
      !normalizedQuery ||
      user.username.toLowerCase().includes(normalizedQuery) ||
      user.displayName.toLowerCase().includes(normalizedQuery),
  )

  const copyInvite = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
    } catch (error) {
      showRequestError(error)
    }
  }

  return (
    <div className="grid gap-10">
      <section aria-labelledby="admin-users-title" className="grid gap-4">
        <div>
          <h2 id="admin-users-title" className="text-lg font-semibold">
            {strings.admin.users}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{strings.admin.usersDescription}</p>
        </div>
        <search>
          <form action="/admin" method="get" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="admin-user-search" className="sr-only">
              {strings.admin.searchUsers}
            </label>
            <div className="relative max-w-md">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              />
              <Input
                id="admin-user-search"
                name="query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={strings.admin.searchUsers}
                autoComplete="off"
                className="pl-9"
              />
            </div>
          </form>
        </search>
        <ul className="overflow-hidden rounded-xl border bg-card">
          {visibleUsers.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-4 border-b p-4 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{user.displayName}</p>
                <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
              </div>
              {user.isAdmin ? <Badge>{strings.admin.administrator}</Badge> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="admin-invites-title" className="grid gap-4">
        <div>
          <h2 id="admin-invites-title" className="text-lg font-semibold">
            {strings.admin.invites}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{strings.admin.invitesDescription}</p>
        </div>
        <CreateInviteForm onCreated={onInviteCreated} />
        <ul className="grid gap-2">
          {invites.map((invite) => (
            <li
              key={invite.code}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={invite.url}
                  className="block truncate text-sm font-medium text-primary hover:underline"
                >
                  {invite.url}
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  {strings.admin.uses}: {invite.uses} / {invite.maxUses ?? '∞'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyInvite(invite.url)}
              >
                <Copy aria-hidden="true" />
                {strings.admin.copyLink}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="admin-bots-title" className="grid gap-4">
        <div>
          <h2 id="admin-bots-title" className="text-lg font-semibold">
            {strings.admin.bots}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{strings.admin.botsDescription}</p>
        </div>
        <BotManager bots={bots} onChanged={onBotChanged} onToken={onToken} />
      </section>
    </div>
  )
}
