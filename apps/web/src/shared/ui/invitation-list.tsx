import { Check, Copy, Pencil } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
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
  const [action, setAction] = useState<{ row: T; edit: boolean }>()
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState<string>()
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">Пригласительных ссылок пока нет.</p>
  const now = Date.now()
  return (
    <>
      <ul ref={list} tabIndex={-1} className="grid gap-2">
        {rows.map((row) => {
          const status = row.revokedAt
            ? 'Отозвана'
            : row.expiresAt && row.expiresAt <= now
              ? 'Истекла'
              : row.maxUses !== null && row.uses >= row.maxUses
                ? 'Лимит исчерпан'
                : 'Активна'
          return (
            <li key={row.id} className="settings-card flex min-w-0 flex-wrap items-center gap-3">
              <div className="min-w-0 flex-[1_1_12rem]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{status}</Badge>
                  {(row.roles.length ? row.roles : ['Базовый доступ']).map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 truncate text-sm" title={row.url ?? undefined}>
                  {row.url ?? 'Ссылка из предыдущей версии'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Приняли {row.uses} / {row.maxUses ?? '∞'} ·{' '}
                  {row.expiresAt ? `До ${dateTime.format(row.expiresAt)}` : 'Бессрочно'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {row.url ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Скопировать ссылку"
                    title="Скопировать ссылку"
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
                        aria-label="Редактировать ссылку"
                        title="Редактировать ссылку"
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
                      Отозвать
                    </Button>
                  </>
                ) : null}
                {copied === row.id ? (
                  <span role="status" className="sr-only">
                    Скопировано
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
              <DialogTitle>{action.edit ? 'Редактировать ссылку' : 'Отозвать ссылку'}</DialogTitle>
              <DialogDescription>
                {action.edit
                  ? 'Изменения применятся к следующим переходам по этой ссылке.'
                  : 'По этой ссылке больше нельзя будет присоединиться. Доступ действующих участников сохранится.'}
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
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant={action.edit ? 'default' : 'destructive'}
                  disabled={pending}
                >
                  {action.edit ? 'Сохранить' : 'Отозвать'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
