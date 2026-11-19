import { useTranslation } from 'react-i18next'
import { useRegistrationPolicy } from '@/entities/session'
import { type AdminInvite, editPlatformInvite, revokePlatformInvite } from '@/entities/user'
import { CreateInviteForm } from '@/features/create-invite'
import { InvitationList } from '@/shared/ui/invitation-list'
import { PlatformInviteRole } from '@/shared/ui/invite-fields'

export const AdminInvitesSection = ({
  invites,
  onInviteCreated,
}: {
  invites: AdminInvite[]
  onInviteCreated: (invite: AdminInvite) => void
}) => {
  const { t } = useTranslation()
  const policy = useRegistrationPolicy()
  return (
    <section aria-label={t('admin:invites')} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('admin:invitesDescription')}</p>
        {policy?.invitations ? (
          <CreateInviteForm onCreated={onInviteCreated} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('admin:invitesDisabled')}</p>
        )}
      </div>
      <InvitationList
        rows={invites.map((invite) => ({
          ...invite,
          id: invite.code,
          roles: [t(`settings:roles.${invite.role}`)],
        }))}
        editable={policy?.invitations ?? false}
        roleFields={(row) => <PlatformInviteRole value={row.role} />}
        onEdit={async (row, data, limits) => {
          onInviteCreated(
            await editPlatformInvite(row.code, {
              ...limits,
              role: data.get('role') === 'admin' ? 'admin' : 'user',
            }),
          )
        }}
        onRevoke={async (row) => {
          await revokePlatformInvite(row.code)
          onInviteCreated({ ...row, revokedAt: Date.now() })
        }}
      />
    </section>
  )
}
