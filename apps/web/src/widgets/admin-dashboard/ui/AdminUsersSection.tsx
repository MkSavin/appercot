import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { SessionUser } from '@/entities/chat'
import { useRegistrationPolicy } from '@/entities/session'
import type { AdminInvite } from '@/entities/user'
import { CreateInviteForm } from '@/features/create-invite'
import { Badge } from '@/shared/ui/badge'
import { SearchInput } from '@/shared/ui/search-input'

export const AdminUsersSection = ({
  users,
  onInviteCreated,
}: {
  users: SessionUser[]
  onInviteCreated: (invite: AdminInvite) => void
}) => {
  const { t } = useTranslation()
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
    <section aria-label={t('admin:users')} className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <search className="min-w-40 flex-1">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            aria-label={t('admin:searchUsers')}
            placeholder={t('admin:searchUsers')}
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
                <Badge variant="outline">{t(`settings:roles.${user.role}`)}</Badge>
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
          {t('chat:noSearchResults')}
        </p>
      )}
    </section>
  )
}
