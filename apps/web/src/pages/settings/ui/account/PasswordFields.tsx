import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/input'
import { SettingsField } from '@/shared/ui/settings-field'

export const PasswordFields = ({
  twoFactor,
  current = true,
}: {
  twoFactor: boolean
  current?: boolean
}) => {
  const { t } = useTranslation()
  return (
    <>
      {current ? (
        <SettingsField name="account-password" label={t('account:currentPassword')}>
          <Input
            id="account-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
          />
        </SettingsField>
      ) : null}
      {twoFactor ? (
        <SettingsField name="account-otp" label={t('account:otpOrRecovery')}>
          <Input id="account-otp" name="otp" autoComplete="one-time-code" required maxLength={64} />
        </SettingsField>
      ) : null}
    </>
  )
}
