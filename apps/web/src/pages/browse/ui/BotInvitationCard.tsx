import { Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'

export const BotInvitationCard = ({
  username,
  pending,
  failed,
  onAccept,
}: {
  username: string
  pending: boolean
  failed: boolean
  onAccept: () => void
}) => {
  const { t } = useTranslation()
  return (
    <section className="settings-card mb-5 grid justify-items-start gap-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <Link2 aria-hidden="true" className="size-4" />
        {t('browse:joinInvitation')}
      </h2>
      <p className="text-sm font-medium">@{username}</p>
      <p className="text-sm text-muted-foreground">{t('browse:invitationHint')}</p>
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          {t('browse:invitationFailed')}
        </p>
      ) : null}
      <Button disabled={pending} onClick={onAccept}>
        {t('browse:open')}
      </Button>
    </section>
  )
}
