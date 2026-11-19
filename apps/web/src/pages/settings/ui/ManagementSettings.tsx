import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAdminBots, type IssuedBotToken, type ManagedBot } from '@/entities/bot'
import type { SessionUser } from '@/entities/chat'
import { type AdminInvite, fetchAdminInvites, fetchAdminUsers } from '@/entities/user'
import { BotTokenDialog } from '@/features/bot-token-manage'
import { Button } from '@/shared/ui/button'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { AdminDashboard } from '@/widgets/admin-dashboard'

export const ManagementSettings = ({ section }: { section: 'users' | 'invites' | 'bots' }) => {
  const { t } = useTranslation()
  const [users, setUsers] = useState<SessionUser[]>([])
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [bots, setBots] = useState<ManagedBot[]>([])
  const [issuedToken, setIssuedToken] = useState<IssuedBotToken>()
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

  if (status === 'loading') return <PagePlaceholder variant="list" />
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
    <>
      <AdminDashboard
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
          setBots((current) => [{ ...issued.bot, access: 'public', memberCount: 0 }, ...current])
          setIssuedToken(issued)
        }}
      />
      {issuedToken ? (
        <BotTokenDialog
          open
          token={issuedToken.token}
          botName={issuedToken.bot.name}
          onClose={() => setIssuedToken(undefined)}
        />
      ) : null}
    </>
  )
}
