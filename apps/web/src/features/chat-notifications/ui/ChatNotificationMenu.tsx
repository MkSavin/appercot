import { Bell, BellOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setChatMuteRequest, setChatNotificationsRequest, useChatStore } from '@/entities/chat'
import { showRequestError } from '@/shared/api'
import { testId, testIds } from '@/shared/lib/test-ids'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { updateChatMute, updateChatNotifications } from '../model/update-chat-notifications'
import { useNotificationMute } from '../model/use-notification-mute'

type NotificationMode = 'all' | 'silent' | 'off'
const modes: NotificationMode[] = ['all', 'silent', 'off']
const isNotificationMode = (mode: string): mode is NotificationMode =>
  modes.some((candidate) => candidate === mode)
const presets = [
  { id: '1h', milliseconds: 60 * 60 * 1000 },
  { id: '8h', milliseconds: 8 * 60 * 60 * 1000 },
  { id: '1d', milliseconds: 24 * 60 * 60 * 1000 },
] as const

export const ChatNotificationMenu = ({
  chatId,
  trigger = 'icon',
  align = 'end',
}: {
  chatId: string
  trigger?: 'icon' | 'button'
  align?: 'start' | 'center' | 'end'
}) => {
  const { t, i18n } = useTranslation()
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId))
  const [pending, setPending] = useState(false)
  const muted = useNotificationMute(chat?.notificationsMutedUntil)
  if (!chat) return null
  const notifications = chat.notifications ?? 'all'
  const expiry = muted.active
    ? new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(chat.notificationsMutedUntil ?? muted.now)
    : null
  const status = muted.active
    ? t('bot:notificationsMutedUntil', { time: expiry })
    : t(`bot:notificationsStatus.${notifications}`)
  const Icon = notifications === 'off' || muted.active ? BellOff : Bell

  const run = async (operation: () => Promise<void>) => {
    setPending(true)
    try {
      await operation()
    } catch (error) {
      showRequestError(error)
    } finally {
      setPending(false)
    }
  }
  const setMute = (mutedUntil: number | null) =>
    void run(() => updateChatMute(useChatStore, chatId, mutedUntil, setChatMuteRequest))

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          {...testId(
            trigger === 'icon'
              ? testIds.chat.notifications.trigger
              : testIds.chat.notifications.profileTrigger,
          )}
          variant="outline"
          size={trigger === 'icon' ? 'icon' : 'default'}
          className={trigger === 'icon' ? 'size-11 shrink-0 md:size-9' : 'min-h-11 md:min-h-9'}
          aria-label={t('bot:notificationsWithStatus', { status })}
        >
          {pending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Icon aria-hidden="true" />
          )}
          {trigger === 'button' ? t('bot:notifications') : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        {...testId(testIds.chat.notifications.menu)}
        align={align}
        className="w-64"
      >
        <DropdownMenuLabel>{t('bot:notifications')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={notifications}
          onValueChange={(mode) => {
            if (isNotificationMode(mode) && mode !== notifications)
              void run(() =>
                updateChatNotifications(useChatStore, chatId, mode, setChatNotificationsRequest),
              )
          }}
        >
          {modes.map((mode) => (
            <DropdownMenuRadioItem
              {...testId(testIds.chat.notifications.mode(mode))}
              key={mode}
              value={mode}
              disabled={pending}
            >
              {t(`bot:notificationsMode.${mode}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {muted.active ? (
          <>
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {t('bot:notificationsMutedUntil', { time: expiry })}
            </DropdownMenuLabel>
            <DropdownMenuItem
              {...testId(testIds.chat.notifications.resume)}
              disabled={pending}
              onSelect={() => setMute(null)}
            >
              <Bell aria-hidden="true" />
              {t('bot:notificationsResume')}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>{t('bot:notificationsMute')}</DropdownMenuLabel>
            {presets.map((preset) => (
              <DropdownMenuItem
                {...testId(testIds.chat.notifications.mute(preset.id))}
                key={preset.id}
                disabled={pending}
                onSelect={() => setMute(Date.now() + preset.milliseconds)}
              >
                {t(`bot:notificationsMutePreset.${preset.id}`)}
              </DropdownMenuItem>
            ))}
          </>
        )}
        {chat.blocked ? (
          <DropdownMenuLabel className="font-normal whitespace-normal text-muted-foreground">
            {t('bot:notificationsBlockedHint')}
          </DropdownMenuLabel>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
