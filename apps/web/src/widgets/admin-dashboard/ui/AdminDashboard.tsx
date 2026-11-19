import type { IssuedBotToken, ManagedBot } from '@/entities/bot'
import type { SessionUser } from '@/entities/chat'
import type { AdminInvite } from '@/entities/user'
import { AdminBotsSection } from './AdminBotsSection'
import { AdminInvitesSection } from './AdminInvitesSection'
import { AdminUsersSection } from './AdminUsersSection'

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
}: AdminDashboardProps) => (
  <div className="grid gap-5">
    {section === 'users' ? (
      <AdminUsersSection users={users} onInviteCreated={onInviteCreated} />
    ) : null}
    {section === 'invites' ? (
      <AdminInvitesSection invites={invites} onInviteCreated={onInviteCreated} />
    ) : null}
    {section === 'bots' ? <AdminBotsSection bots={bots} onToken={onToken} /> : null}
  </div>
)
