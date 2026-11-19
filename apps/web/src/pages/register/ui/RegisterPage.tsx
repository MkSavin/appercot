import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearch } from 'wouter'
import { useRegistrationPolicy } from '@/entities/session'
import { RegisterForm } from '@/features/register-form'
import { authHref, readAuthReturn } from '@/shared/lib/auth-return'
import { AuthShell } from '@/shared/ui/auth-shell'

export const RegisterPage = () => {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const search = useSearch()
  const invite = new URLSearchParams(search).get('invite') ?? ''
  const next = readAuthReturn(search)
  const policy = useRegistrationPolicy()
  return (
    <AuthShell
      title={t('auth:registerTitle')}
      subtitle={t('auth:registerSubtitle')}
      titleId="register-title"
    >
      {policy?.registration === false ? (
        <p role="status">{t('registration:disabled')}</p>
      ) : (
        <RegisterForm initialInvite={invite} onSuccess={() => navigate(next, { replace: true })} />
      )}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t('auth:haveAccount')}{' '}
        <Link href={authHref('/login', next)} className="font-medium text-primary hover:underline">
          {t('auth:signIn')}
        </Link>
      </p>
    </AuthShell>
  )
}
