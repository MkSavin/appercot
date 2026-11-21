import { LucideComputer, LucideSmartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listSessions, revokeSession } from '@/entities/user'
import { Button } from '@/shared/ui/button'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { sessionDevice, sessionDeviceType } from '../../model/session-device'
import { AccountDialog } from './AccountDialog'

const dateTime = new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' })

export const SessionList = ({ onSignOut }: { onSignOut: () => void }) => {
  const { t } = useTranslation()
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listSessions>>>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (rows || failed) return
    let active = true
    listSessions()
      .then((result) => {
        if (active) setRows(result)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [failed, rows])
  if (failed)
    return (
      <Button variant="outline" onClick={() => setFailed(false)}>
        {t('common:retry')}
      </Button>
    )
  if (!rows) return <PagePlaceholder variant="list" />
  return (
    <ul className="divide-y [&>:not(:last-child)]:mb-3 [&>:not(:last-child)]:pb-3">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-3">
          {sessionDeviceType(row.userAgent) === 'mobile' ? (
            <LucideSmartphone className="h-5 w-5 text-muted-foreground" />
          ) : (
            <LucideComputer className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-grow-1">
            <p className="text-sm font-medium" title={row.userAgent ?? undefined}>
              {sessionDevice(row.userAgent)}
            </p>
            <p className="text-xs text-muted-foreground">
              {dateTime.format(row.createdAt)}{' '}
              {row.current ? `· ${t('account:currentSession')}` : ''}
            </p>
          </div>
          <AccountDialog
            title={t('account:endSession')}
            description={t('account:endSessionDescription')}
            submit={async () => {
              await revokeSession(row.id)
              if (row.current) onSignOut()
              else setRows((previous) => previous?.filter((item) => item.id !== row.id))
            }}
          >
            {null}
          </AccountDialog>
        </li>
      ))}
    </ul>
  )
}
