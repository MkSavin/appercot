import qrcode from 'qrcode-generator'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { beginTotp, disableTotp, enableTotp } from '@/entities/user'
import { showRequestError } from '@/shared/api'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { SettingsField } from '@/shared/ui/settings-field'
import { formText } from '../../model/form'
import { AccountDialog } from './AccountDialog'
import { PasswordFields } from './PasswordFields'
import { SecuritySetting } from './SecuritySetting'

const TotpQr = ({ username, secret }: { username: string; secret: string }) => {
  const { t } = useTranslation()
  const qr = qrcode(0, 'M')
  const params = new URLSearchParams({ secret, issuer: 'Appercot' })
  qr.addData(`otpauth://totp/Appercot:${encodeURIComponent(username)}?${params}`)
  qr.make()
  return (
    <img
      src={qr.createDataURL(4, 16)}
      alt={t('account:qrAlt')}
      className="size-40 rounded-md border bg-white [image-rendering:pixelated]"
    />
  )
}

export const TotpSettings = ({
  enabled,
  username,
  onChanged,
}: {
  enabled: boolean
  username: string
  onChanged: (enabled: boolean) => void
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [secret, setSecret] = useState('')
  const [recovery, setRecovery] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  return (
    <SecuritySetting
      title={
        <>
          {t('account:totp')}
          {enabled ? (
            <Badge className="border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              {t('account:totpEnabled')}
            </Badge>
          ) : null}
        </>
      }
      description={enabled ? t('account:totpDisableHint') : t('account:totpEnableHint')}
    >
      {enabled && !open ? (
        <AccountDialog
          title={t('account:disableTotp')}
          description={t('account:disableTotpDescription')}
          submit={async (form) => {
            await disableTotp(formText(form, 'password'), formText(form, 'otp'))
            onChanged(false)
          }}
        >
          <PasswordFields twoFactor />
        </AccountDialog>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(value) => {
            if (pending) return
            setOpen(value)
            if (!value) {
              setSecret('')
              setRecovery('')
              setPassword('')
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline">{t('account:configureTotp')}</Button>
          </DialogTrigger>
          <DialogContent className={secret && !recovery ? 'sm:max-w-lg' : undefined}>
            <DialogHeader>
              <DialogTitle>{t('account:totp')}</DialogTitle>
              <DialogDescription>
                {recovery
                  ? t('account:recoveryDescription')
                  : secret
                    ? t('account:secretDescription')
                    : t('account:passwordDescription')}
              </DialogDescription>
            </DialogHeader>
            {recovery ? (
              <SettingsField name="totp-recovery" label={t('account:recoveryCode')}>
                <Input
                  id="totp-recovery"
                  readOnly
                  value={recovery}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </SettingsField>
            ) : (
              <form
                className="grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  setPending(true)
                  try {
                    if (!secret) setSecret(await beginTotp(password))
                    else {
                      setRecovery(await enableTotp(password, formText(form, 'code')))
                      setPassword('')
                      onChanged(true)
                    }
                  } catch (error) {
                    showRequestError(error)
                  } finally {
                    setPending(false)
                  }
                }}
              >
                {secret ? (
                  <div className="grid items-start justify-items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:justify-items-stretch">
                    <TotpQr username={username} secret={secret} />
                    <div className="grid w-full gap-3">
                      <SettingsField name="totp-secret" label={t('account:setupKey')}>
                        <Input
                          id="totp-secret"
                          value={secret}
                          readOnly
                          onFocus={(event) => event.currentTarget.select()}
                        />
                      </SettingsField>
                      <SettingsField name="totp-code" label={t('account:appCode')}>
                        <Input
                          id="totp-code"
                          name="code"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          autoComplete="one-time-code"
                          required
                        />
                      </SettingsField>
                    </div>
                  </div>
                ) : (
                  <SettingsField name="totp-password" label={t('account:currentPassword')}>
                    <Input
                      id="totp-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </SettingsField>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    {secret ? t('account:enableTotp') : t('account:getKey')}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </SecuritySetting>
  )
}
