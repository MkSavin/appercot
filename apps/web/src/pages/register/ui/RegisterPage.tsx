import { Link, useLocation, useSearch } from 'wouter'
import { RegisterForm } from '@/features/register-form'
import { strings } from '@/shared/config'
import { AuthShell } from '@/shared/ui/auth-shell'

export const RegisterPage = () => {
  const [, navigate] = useLocation()
  const search = useSearch()
  const invite = new URLSearchParams(search).get('invite') ?? ''
  return (
    <AuthShell
      title={strings.auth.registerTitle}
      subtitle={strings.auth.registerSubtitle}
      titleId="register-title"
    >
      <RegisterForm initialInvite={invite} onSuccess={() => navigate('/')} />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {strings.auth.haveAccount}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {strings.auth.signIn}
        </Link>
      </p>
    </AuthShell>
  )
}
