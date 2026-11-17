import { Link, useLocation } from 'wouter'
import { LoginForm } from '@/features/login-form'
import { strings } from '@/shared/config'
import { AuthShell } from '@/shared/ui/auth-shell'

export const LoginPage = () => {
  const [, navigate] = useLocation()
  return (
    <AuthShell
      title={strings.auth.signInTitle}
      subtitle={strings.auth.signInSubtitle}
      titleId="login-title"
    >
      <LoginForm onSuccess={() => navigate('/')} />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {strings.auth.noAccount}{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {strings.auth.createAccount}
        </Link>
      </p>
    </AuthShell>
  )
}
