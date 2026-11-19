import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/entities/chat'
import { fetchAdminUser, resetUserPassword, setUserRoleRequest } from '@/entities/user'
import { showRequestError } from '@/shared/api'
import type { SessionUser } from '@/shared/model'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { PagePlaceholder } from '@/shared/ui/page-placeholder'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { SettingsField } from '@/shared/ui/settings-field'
import { SettingsSection } from '@/shared/ui/settings-section'
import { formText } from '../model/form'
import { AccountDialog } from './account/AccountDialog'
import { ProfileEditor } from './account/ProfileEditor'

export const AdminAccountSettings = ({ userId }: { userId: string }) => {
  const { t } = useTranslation()
  const [user, setUser] = useState<SessionUser>()
  const [failed, setFailed] = useState(false)
  const [rolePending, setRolePending] = useState(false)
  useEffect(() => {
    if (user || failed) return
    let active = true
    fetchAdminUser(userId)
      .then((result) => {
        if (active) setUser(result)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [userId, user, failed])
  if (!user)
    return failed ? (
      <Button variant="outline" onClick={() => setFailed(false)}>
        {t('common:retry')}
      </Button>
    ) : (
      <PagePlaceholder variant="settings" />
    )
  return (
    <>
      <ProfileEditor
        roleEditor={
          user.role !== 'owner' ? (
            <Select
              value={user.role}
              disabled={rolePending}
              onValueChange={async (role) => {
                if (role !== 'user' && role !== 'admin') return
                setRolePending(true)
                try {
                  const updated = await setUserRoleRequest(user.id, role)
                  setUser((current) => current && { ...current, role: updated.role })
                } catch (error) {
                  showRequestError(error)
                } finally {
                  setRolePending(false)
                }
              }}
            >
              <SelectTrigger aria-label={t('account:platformRole')} className="w-full sm:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t('settings:roles.user')}</SelectItem>
                <SelectItem value="admin">{t('settings:roles.admin')}</SelectItem>
              </SelectContent>
            </Select>
          ) : undefined
        }
        user={user}
        onSave={(next) => {
          setUser(next)
          if (useChatStore.getState().user?.id === next.id) useChatStore.setState({ user: next })
        }}
        admin
      />
      {user.role !== 'owner' ? (
        <SettingsSection title={t('account:password')}>
          <div className="grid justify-items-start gap-2">
            <AccountDialog
              title={t('account:resetPassword')}
              description={t('account:resetPasswordDescription')}
              submit={async (form) => {
                await resetUserPassword(user.id, formText(form, 'new-password'))
              }}
            >
              <SettingsField name="new-password" label={t('account:newPassword')}>
                <Input
                  id="new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={256}
                  required
                />
              </SettingsField>
            </AccountDialog>
          </div>
        </SettingsSection>
      ) : null}
    </>
  )
}
