import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

export const InviteRoleChoices = ({
  options,
  selected = [],
  emptyLabel,
}: {
  options: { code: string; name: string; virtual: boolean }[]
  selected?: string[]
  emptyLabel?: string
}) => {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {t('invitation:botRole')}
      </label>
      <Select name="role" defaultValue={selected[0] ?? ':default'}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value=":default">{emptyLabel ?? t('invitation:defaultRole')}</SelectItem>
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
