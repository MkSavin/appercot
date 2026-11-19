import { Link, useLocation, useSearch } from 'wouter'
import { useRegistrationPolicy } from '@/entities/session'
import { LoginForm } from '@/features/login-form'
import { strings } from '@/shared/config'
import { authHref, readAuthReturn } from '@/shared/lib/auth-return'

export const LoginPage = () => {
  const [, navigate] = useLocation()
  const next = readAuthReturn(useSearch())
  const policy = useRegistrationPolicy()
  return (
    <LoginForm onSuccess={() => navigate(next, { replace: true })}>
      {policy?.registration ? (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {strings.auth.noAccount}{' '}
          <Link
            href={authHref('/register', next)}
            className="font-medium text-primary hover:underline"
          >
            {strings.auth.createAccount}
          </Link>
        </p>
      ) : null}
    </LoginForm>
  )
}
