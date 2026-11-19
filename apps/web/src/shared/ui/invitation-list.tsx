import { Check, Copy, Pencil } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { showRequestError } from '@/shared/api'
import { Badge } from './badge'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { InviteLimits, readInviteLimits } from './invite-fields'

interface Invitation {
  id: string
  url: string | null
  roles: string[]
  uses: number
  maxUses: number | null
  expiresAt: number | null
  revokedAt: number | null
}

const dateTime = new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' })

export const InvitationList = <T extends Invitation>({
  rows,
  editable = true,
  roleFields,
  onEdit,
  onRevoke,
}: {
  rows: T[]
  editable?: boolean
  roleFields: (row: T) => ReactNode
  onEdit: (row: T, data: FormData, limits: ReturnType<typeof readInviteLimits>) => Promise<void>
  onRevoke: (row: T) => Promise<void>
}) => {
  const { t } = useTranslation()
  const [action, setAction] = useState<{ row: T; edit: boolean }>()
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState<string>()
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t('invitation:empty')}</p>
  const now = Date.now()
  return (
    <>
      <ul ref={list} tabIndex={-1} className="grid gap-2">
        {rows.map((row) => {
          const status = row.revokedAt
            ? t('invitation:revoked')
            : row.expiresAt && row.expiresAt <= now
              ? t('invitation:expired')
              : row.maxUses !== null && row.uses >= row.maxUses
                ? t('invitation:exhausted')
                : t('invitation:active')
          return (
            <li key={row.id} className="settings-card flex min-w-0 flex-wrap items-center gap-3">
              <div className="min-w-0 flex-[1_1_12rem]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{status}</Badge>
                  {(row.roles.length ? row.roles : [t('invitation:defaultAccess')]).map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 truncate text-sm" title={row.url ?? undefined}>
                  {row.url ?? t('invitation:legacyLink')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('invitation:accepted', { uses: row.uses, max: row.maxUses ?? '∞' })} ·{' '}
                  {row.expiresAt
                    ? t('invitation:until', { date: dateTime.format(row.expiresAt) })
                    : t('invitation:noExpiry')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {row.url ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('invitation:copy')}
                    title={t('invitation:copy')}
                    onClick={async () => {
                      if (!row.url) return
                      try {
                        await navigator.clipboard.writeText(row.url)
                        setCopied(row.id)
                      } catch (error) {
                        showRequestError(error)
                      }
                    }}
                  >
                    {copied === row.id ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  </Button>
                ) : null}
                {!row.revokedAt ? (
                  <>
                    {editable ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('invitation:edit')}
                        title={t('invitation:edit')}
                        onClick={(event) => {
                          trigger.current = event.currentTarget
                          setAction({ row, edit: true })
                        }}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        trigger.current = event.currentTarget
                        setAction({ row, edit: false })
                      }}
                    >
                      {t('invitation:revoke')}
                    </Button>
                  </>
                ) : null}
                {copied === row.id ? (
                  <span role="status" className="sr-only">
                    {t('common:copied')}
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      <Dialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open && !pending) setAction(undefined)
        }}
      >
        {action ? (
          <DialogContent
            className="max-h-[90dvh] overflow-y-auto"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              if (trigger.current?.isConnected) trigger.current.focus()
              else list.current?.focus()
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {action.edit ? t('invitation:edit') : t('invitation:revokeTitle')}
              </DialogTitle>
              <DialogDescription>
                {action.edit ? t('invitation:editDescription') : t('invitation:revokeDescription')}
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                setPending(true)
                try {
                  if (action.edit) await onEdit(action.row, data, readInviteLimits(data, true))
                  else await onRevoke(action.row)
                  setAction(undefined)
                } catch (error) {
                  showRequestError(error)
                } finally {
                  setPending(false)
                }
              }}
            >
              {action.edit ? (
                <>
                  {roleFields(action.row)}
                  <InviteLimits editing maxUses={action.row.maxUses} />
                </>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setAction(undefined)}
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  type="submit"
                  variant={action.edit ? 'default' : 'destructive'}
                  disabled={pending}
                >
                  {action.edit ? t('common:save') : t('invitation:revoke')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
