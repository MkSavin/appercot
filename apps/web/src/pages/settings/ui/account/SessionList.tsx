import { LucideComputer, LucideSmartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listSessions, revokeOtherSessions, revokeSession } from '@/entities/user'
import { formatDate } from '@/shared/lib/format-date'
import { testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import { FieldSeparator } from '@/shared/ui/field'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { sessionDevice, sessionDeviceType } from '../../model/session-device'
import { AccountDialog } from './AccountDialog'
import { SettingsRow } from './SettingsRow'

export const SessionList = () => {
  const { t, i18n } = useTranslation()
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
  if (!rows) return <PagePlaceholder variant="sessions" />
  const hasOtherSessions = rows.some((row) => !row.current)

  return (
    <div className="grid gap-4">
      <ul className="divide-y [&>:not(:last-child)]:mb-3 [&>:not(:last-child)]:pb-3">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-3">
            {sessionDeviceType(row.userAgent) === 'mobile' ? (
              <LucideSmartphone className="h-5 w-5 text-muted-foreground" />
            ) : (
              <LucideComputer className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="min-w-0 grow">
              <p className="text-sm font-medium" title={row.userAgent ?? undefined}>
                {sessionDevice(row.userAgent)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(row.createdAt, i18n.resolvedLanguage, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                {row.current ? `· ${t('account:currentSession')}` : ''}
              </p>
            </div>
            {!row.current ? (
              <AccountDialog
                title={t('account:endSession')}
                description={t('account:endSessionDescription')}
                triggerTestId={testIds.settings.sessions.end(row.id)}
                submit={async () => {
                  await revokeSession(row.id)
                  setRows((previous) => previous?.filter((item) => item.id !== row.id))
                }}
              >
                {null}
              </AccountDialog>
            ) : null}
          </li>
        ))}
      </ul>

      <FieldSeparator />

      {hasOtherSessions ? (
        <SettingsRow
          title={t('account:endAllSessions')}
          description={t('account:endAllSessionsHint')}
        >
          <AccountDialog
            title={t('account:endAllSessions')}
            description={t('account:endAllSessionsDescription')}
            triggerTestId={testIds.settings.sessions.endAll}
            destructive
            submit={async () => {
              await revokeOtherSessions()
              setRows((previous) => previous?.filter((row) => row.current))
            }}
          >
            {null}
          </AccountDialog>
        </SettingsRow>
      ) : null}
    </div>
  )
}
