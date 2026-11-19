import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'wouter'
import { useChatStore } from '@/entities/chat'
import { logoutRequest } from '@/entities/session'
import { changePassword, deleteAccount } from '@/entities/user'
import { showRequestError } from '@/shared/api'
import type { SessionUser } from '@/shared/model'
import { Button } from '@/shared/ui/button'
import { FieldSeparator } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { SettingsField } from '@/shared/ui/settings-field'
import { SettingsSection } from '@/shared/ui/settings-section'
import { formText } from '../model/form'
import { AccountDialog } from './account/AccountDialog'
import { PasswordFields } from './account/PasswordFields'
import { ProfileEditor } from './account/ProfileEditor'
import { SecuritySetting } from './account/SecuritySetting'
import { SessionList } from './account/SessionList'
import { TotpSettings } from './account/TotpSettings'

export const AccountSettings = ({ user }: { user: SessionUser }) => {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const [sessionRevision, setSessionRevision] = useState(0)
  const signOut = () => {
    useChatStore.getState().clearSession()
    navigate('/login', { replace: true })
  }
  const changed = (next: SessionUser) => useChatStore.setState({ user: next })
  return (
    <>
      <ProfileEditor user={user} onSave={changed} />
      <SettingsSection title={t('account:security')}>
        <SecuritySetting title={t('account:password')} description={t('account:passwordHint')}>
          <AccountDialog
            title={t('account:changePassword')}
            description={t('account:changePasswordDescription')}
            submit={(form) =>
              changePassword({
                password: formText(form, 'password'),
                otp: formText(form, 'otp') || undefined,
                newPassword: formText(form, 'new-password'),
              }).then(() => setSessionRevision((current) => current + 1))
            }
          >
            <PasswordFields twoFactor={Boolean(user.twoFactorEnabled)} />
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
        </SecuritySetting>
        <FieldSeparator />
        <TotpSettings
          username={user.username}
          enabled={Boolean(user.twoFactorEnabled)}
          onChanged={(twoFactorEnabled) => changed({ ...user, twoFactorEnabled })}
        />
      </SettingsSection>
      <SettingsSection title={t('account:sessions')}>
        <SessionList key={sessionRevision} onSignOut={signOut} />
      </SettingsSection>
      <SettingsSection title={t('account:management')}>
        <div className="flex flex-wrap items-start gap-3">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const registration = await navigator.serviceWorker
                  ?.getRegistration()
                  .catch(() => undefined)
                const subscription = await registration?.pushManager
                  ?.getSubscription()
                  .catch(() => null)
                await logoutRequest(subscription?.endpoint)
                signOut()
              } catch (error) {
                showRequestError(error)
              }
            }}
          >
            {t('chat:logout')}
          </Button>
          {user.role !== 'owner' ? (
            <AccountDialog
              title={t('account:delete')}
              description={t('account:deleteDescription')}
              destructive
              submit={async (form) => {
                await deleteAccount({
                  password: formText(form, 'password'),
                  otp: formText(form, 'otp') || undefined,
                })
                signOut()
              }}
            >
              <PasswordFields twoFactor={Boolean(user.twoFactorEnabled)} />
            </AccountDialog>
          ) : null}
        </div>
      </SettingsSection>
    </>
  )
}
