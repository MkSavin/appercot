import { Link, useLocation, useSearch } from 'wouter'
import { useRegistrationPolicy } from '@/entities/session'
import { RegisterForm } from '@/features/register-form'
import { strings } from '@/shared/config'
import { authHref, readAuthReturn } from '@/shared/lib/auth-return'
import { AuthShell } from '@/shared/ui/auth-shell'

export const RegisterPage = () => {
  const [, navigate] = useLocation()
  const search = useSearch()
  const invite = new URLSearchParams(search).get('invite') ?? ''
  const next = readAuthReturn(search)
  const policy = useRegistrationPolicy()
  return (
    <AuthShell
      title={strings.auth.registerTitle}
      subtitle={strings.auth.registerSubtitle}
      titleId="register-title"
    >
      {policy?.registration === false ? (
        <p role="status">Регистрация на этой платформе отключена.</p>
      ) : (
        <RegisterForm initialInvite={invite} onSuccess={() => navigate(next, { replace: true })} />
      )}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {strings.auth.haveAccount}{' '}
        <Link href={authHref('/login', next)} className="font-medium text-primary hover:underline">
          {strings.auth.signIn}
        </Link>
      </p>
    </AuthShell>
  )
}
