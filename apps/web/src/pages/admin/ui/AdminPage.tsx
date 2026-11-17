import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { type BotDetails, fetchAdminBots, type IssuedBotToken } from '@/entities/bot'
import type { SessionUser } from '@/entities/chat'
import { type AdminInvite, fetchAdminInvites, fetchAdminUsers } from '@/entities/user'
import { BotTokenDialog } from '@/features/bot-token-manage'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { AdminDashboard } from '@/widgets/admin-dashboard'

export const AdminPage = () => {
  const [users, setUsers] = useState<SessionUser[]>([])
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [bots, setBots] = useState<BotDetails[]>([])
  const [issuedToken, setIssuedToken] = useState<IssuedBotToken>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([fetchAdminUsers(), fetchAdminInvites(), fetchAdminBots()])
      .then(([nextUsers, nextInvites, nextBots]) => {
        if (!active) return
        setUsers(nextUsers)
        setInvites(nextInvites)
        setBots(nextBots)
      })
      .catch(showRequestError)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            {strings.chat.back}
          </Link>
        </Button>
        <header className="mb-8 flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{strings.admin.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{strings.admin.subtitle}</p>
          </div>
        </header>
        {loading ? (
          <p role="status">{strings.admin.loading}</p>
        ) : (
          <AdminDashboard
            users={users}
            invites={invites}
            bots={bots}
            onInviteCreated={(invite) => setInvites((current) => [invite, ...current])}
            onBotChanged={(bot) =>
              setBots((current) => [bot, ...current.filter((item) => item.id !== bot.id)])
            }
            onToken={setIssuedToken}
          />
        )}
      </div>
      {issuedToken ? (
        <BotTokenDialog
          open
          token={issuedToken.token}
          botName={issuedToken.bot.name}
          onClose={() => setIssuedToken(undefined)}
        />
      ) : null}
    </main>
  )
}
