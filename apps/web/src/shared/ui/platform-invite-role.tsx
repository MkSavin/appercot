import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

export const PlatformInviteRole = ({ value = 'user' }: { value?: 'user' | 'admin' }) => {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {t('account:platformRole')}
      </label>
      <Select name="role" defaultValue={value}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user">{t('settings:roles.user')}</SelectItem>
          <SelectItem value="admin">{t('settings:roles.admin')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
