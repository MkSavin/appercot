import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAdminBots, type ManagedBot } from '@/entities/bot'
import { type SessionUser, useChatStore } from '@/entities/chat'
import { type AdminInvite, fetchAdminInvites, fetchAdminUsers } from '@/entities/user'
import { Button } from '@/shared/ui/button'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { AdminDashboard } from '@/widgets/admin-dashboard'

export const ManagementSettings = ({ section }: { section: 'users' | 'invites' | 'bots' }) => {
  const { t } = useTranslation()
  const userId = useChatStore((state) => state.user?.id)
  const [users, setUsers] = useState<SessionUser[]>([])
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [bots, setBots] = useState<ManagedBot[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    if (status !== 'loading') return
    let active = true
    const load = async () => {
      try {
        if (section === 'bots') {
          const result = await fetchAdminBots()
          if (active) setBots(result)
        } else if (section === 'users') {
          const result = await fetchAdminUsers()
          if (active) setUsers(result)
        } else {
          const result = await fetchAdminInvites()
          if (active) setInvites(result)
        }
        if (active) setStatus('ready')
      } catch {
        if (active) setStatus('failed')
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [section, status])

  if (status === 'loading') return <PagePlaceholder variant={section} />
  if (status === 'failed')
    return (
      <div className="settings-card grid justify-items-start gap-3">
        <p role="alert">{t('admin:failed')}</p>
        <Button variant="outline" onClick={() => setStatus('loading')}>
          {t('chat:retry')}
        </Button>
      </div>
    )

  return (
    <AdminDashboard
      key={userId}
      section={section}
      users={users}
      invites={invites}
      bots={bots}
      onInviteCreated={(invite) =>
        setInvites((current) =>
          current.some((item) => item.code === invite.code)
            ? current.map((item) => (item.code === invite.code ? invite : item))
            : [invite, ...current],
        )
      }
      onToken={(issued) => {
        setBots((current) => [
          { ...issued.bot, stopped: issued.bot.stopped ?? false, access: 'public', memberCount: 0 },
          ...current,
        ])
      }}
    />
  )
}
