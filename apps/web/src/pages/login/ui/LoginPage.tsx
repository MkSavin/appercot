import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearch } from 'wouter'
import { useRegistrationPolicy } from '@/entities/session'
import { LoginForm } from '@/features/login-form'
import { authHref, readAuthReturn } from '@/shared/lib/auth-return'

export const LoginPage = () => {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const next = readAuthReturn(useSearch())
  const policy = useRegistrationPolicy()
  return (
    <LoginForm onSuccess={() => navigate(next, { replace: true })}>
      {policy?.registration ? (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t('auth:noAccount')}{' '}
          <Link
            href={authHref('/register', next)}
            className="font-medium text-primary hover:underline"
          >
            {t('auth:createAccount')}
          </Link>
        </p>
      ) : null}
    </LoginForm>
  )
}
