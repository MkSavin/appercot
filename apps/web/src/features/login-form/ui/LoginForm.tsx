import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/entities/chat'
import { loginRequest } from '@/entities/session'
import { getRequestErrorCode, getRequestErrorMessage } from '@/shared/api'
import { AuthShell } from '@/shared/ui/auth-shell'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/shared/ui/input-otp'

export const LoginForm = ({
  onSuccess,
  children,
}: {
  onSuccess: () => void
  children?: ReactNode
}) => {
  const { t } = useTranslation()
  const setSession = useChatStore((state) => state.setSession)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requiresOtp, setRequiresOtp] = useState(false)
  const [otp, setOtp] = useState('')
  const [recovery, setRecovery] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      setSession(await loginRequest({ username, password, ...(requiresOtp ? { otp } : {}) }))
      onSuccess()
    } catch (cause) {
      if (getRequestErrorCode(cause) === 'TOTP_REQUIRED') setRequiresOtp(true)
      else setError(getRequestErrorMessage(cause, 'authentication'))
    } finally {
      setSubmitting(false)
    }
  }

  if (requiresOtp)
    return (
      <AuthShell
        title={t('account:totp')}
        subtitle={recovery ? t('account:loginRecoveryHint') : t('account:loginAppHint')}
        titleId="otp-title"
      >
        <form
          className="grid gap-4"
          aria-labelledby="otp-title"
          method="post"
          action="/login"
          onSubmit={submit}
        >
          {recovery ? (
            <Input
              autoFocus
              required
              maxLength={64}
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              aria-label={t('account:recoveryCode')}
            />
          ) : (
            <InputOTP
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              aria-label={t('account:totpAria')}
              value={otp}
              onChange={setOtp}
            >
              <InputOTPGroup aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="h-12"
            disabled={submitting || (recovery ? !otp.trim() : otp.length !== 6)}
          >
            {t('chat:confirm')}
          </Button>
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="link"
              className="px-0"
              disabled={submitting}
              onClick={() => {
                setOtp('')
                setError(null)
                setRecovery(!recovery)
              }}
            >
              {recovery ? t('account:appCode') : t('account:recoveryCode')}
            </Button>
            <Button
              type="button"
              variant="link"
              className="px-0"
              disabled={submitting}
              onClick={() => {
                setUsername('')
                setPassword('')
                setOtp('')
                setRequiresOtp(false)
                setRecovery(false)
                setError(null)
                setShowPassword(false)
              }}
            >
              {t('chat:logout')}
            </Button>
          </div>
        </form>
      </AuthShell>
    )
  return (
    <AuthShell
      title={t('auth:signInTitle')}
      subtitle={t('auth:signInSubtitle')}
      titleId="login-title"
    >
      <form
        method="post"
        action="/login"
        aria-labelledby="login-title"
        className="grid gap-5"
        onSubmit={submit}
      >
        <div className="grid gap-2">
          <label htmlFor="login-username" className="text-sm font-medium">
            {t('auth:username')}
          </label>
          <Input
            id="login-username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            required
            autoFocus
            className="h-12"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="login-password" className="text-sm font-medium">
            {t('auth:password')}
          </label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              enterKeyHint="done"
              required
              className="h-12 pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 text-muted-foreground"
              aria-label={showPassword ? t('auth:hidePassword') : t('auth:showPassword')}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
        </div>
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
          {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {t('auth:signIn')}
        </Button>
      </form>
      {children}
    </AuthShell>
  )
}
