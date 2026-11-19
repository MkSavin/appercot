import { useId } from 'react'
import { strings } from '@/shared/config'
import { Input } from './input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

export const readInviteLimits = (data: FormData, editing = false) => {
  const max = data.get('maxUses')
  const expiry = data.get('expiresInDays')
  return {
    maxUses: max ? Number(max) : null,
    expiresInDays: data.has('noExpiry')
      ? null
      : expiry
        ? Number(expiry)
        : editing
          ? undefined
          : null,
  }
}

export const InviteLimits = ({
  maxUses,
  initialDays,
  editing = false,
  single = false,
}: {
  maxUses?: number | null
  initialDays?: number
  editing?: boolean
  single?: boolean
}) => {
  const id = useId()
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      {single ? (
        <input type="hidden" name="maxUses" value="1" />
      ) : (
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`${id}-max`}>
            Лимит принявших
          </label>
          <Input
            id={`${id}-max`}
            type="number"
            min={1}
            max={2147483647}
            name="maxUses"
            defaultValue={maxUses ?? undefined}
            placeholder="Без лимита"
          />
        </div>
      )}
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor={`${id}-days`}>
          {editing ? 'Новый срок, дней' : 'Срок действия, дней'}
        </label>
        <Input
          id={`${id}-days`}
          type="number"
          min={1}
          max={3650}
          name="expiresInDays"
          defaultValue={initialDays}
          placeholder={editing ? 'Оставить прежний' : 'Без срока'}
        />
        {editing ? (
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" name="noExpiry" />
            Сделать бессрочной
          </label>
        ) : null}
      </div>
    </div>
  )
}

export const readBotInviteRole = (data: FormData) => {
  const value = data.get('role')
  return typeof value === 'string' && value && value !== ':default' ? [value] : []
}

export const InviteRoleChoices = ({
  options,
  selected = [],
  emptyLabel = 'Роль по умолчанию',
}: {
  options: { code: string; name: string; virtual: boolean }[]
  selected?: string[]
  emptyLabel?: string
}) => {
  const id = useId()
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Роль в боте
      </label>
      <Select name="role" defaultValue={selected[0] ?? ':default'}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value=":default">{emptyLabel}</SelectItem>
          {options
            .filter((role) => !role.virtual)
            .map(({ code, name }) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export const PlatformInviteRole = ({ value = 'user' }: { value?: 'user' | 'admin' }) => {
  const id = useId()
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Роль на платформе
      </label>
      <Select name="role" defaultValue={value}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user">{strings.settings.roles.user}</SelectItem>
          <SelectItem value="admin">{strings.settings.roles.admin}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
