import { useTranslation } from 'react-i18next'
import { PushSubscribeButton } from '@/features/push-subscribe'
import { SettingsSection } from '@/shared/ui/settings-section'

export const NotificationSettings = ({ vapidPublicKey }: { vapidPublicKey: string | null }) => {
  const { t } = useTranslation()
  return (
    <SettingsSection title={t('settings:notifications')}>
      <p className="text-sm text-muted-foreground">{t('settings:notificationsHint')}</p>
      <p className="text-sm text-muted-foreground">{t('settings:notificationsPerChatHint')}</p>
      <PushSubscribeButton vapidPublicKey={vapidPublicKey} settings />
    </SettingsSection>
  )
}
