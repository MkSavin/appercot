import { Bell, BellOff, BellRing, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchPushStatus, subscribePushRequest, unsubscribePushRequest } from '@/entities/session'
import { showRequestError } from '@/shared/api'
import { normalizeLocale } from '@/shared/lib/locale'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { subscribeToPush } from '../model/subscribe'

const NotificationAlert = ({
  title,
  description,
  destructive = false,
}: {
  title: string
  description: string
  destructive?: boolean
}) => (
  <Alert variant={destructive ? 'destructive' : 'default'}>
    <BellOff aria-hidden="true" />
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>{description}</AlertDescription>
  </Alert>
)

export const PushSubscribeButton = ({
  vapidPublicKey,
  settings = false,
}: {
  vapidPublicKey: string | null
  settings?: boolean
}) => {
  const { t, i18n } = useTranslation()
  const language = normalizeLocale(i18n.resolvedLanguage)
  const syncedLanguage = useRef<string | null>(null)
  const [pending, setPending] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [unavailable, setUnavailable] = useState<'browser' | 'worker'>()
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!vapidPublicKey || !settings) return
    setUnavailable(undefined)
    if (!('Notification' in window) || !('PushManager' in window) || !navigator.serviceWorker) {
      setUnavailable('browser')
      return
    }
    setBlocked(Notification.permission === 'denied')
    let active = true
    navigator.serviceWorker
      .getRegistration()
      .then(async (registration) => {
        if (!registration) {
          if (active) setUnavailable('worker')
          return
        }
        const subscription = await registration.pushManager.getSubscription()
        const subscribed = subscription ? await fetchPushStatus(subscription.endpoint) : false
        if (active) setEnabled(subscribed)
      })
      .catch(() => {
        if (active) setUnavailable('worker')
      })
    return () => {
      active = false
    }
  }, [settings, vapidPublicKey])

  useEffect(() => {
    if (syncedLanguage.current === language || !enabled || !settings || !vapidPublicKey) return
    let active = true
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        if (!active || !subscription) return
        await subscribePushRequest(subscription.toJSON())
        if (active) syncedLanguage.current = language
      })
      .catch((error) => {
        if (active) showRequestError(error)
      })
    return () => {
      active = false
    }
  }, [enabled, language, settings, vapidPublicKey])

  if (!vapidPublicKey) {
    return settings ? (
      <NotificationAlert
        title={t('settings:notificationsUnavailableTitle')}
        description={t('settings:notificationsServerUnavailable')}
      />
    ) : null
  }
  if (unavailable) {
    return settings ? (
      <NotificationAlert
        title={t('settings:notificationsUnavailableTitle')}
        description={t(
          unavailable === 'browser'
            ? 'settings:notificationsBrowserUnavailable'
            : 'settings:notificationsWorkerUnavailable',
        )}
      />
    ) : null
  }

  const toggle = async () => {
    setPending(true)
    try {
      const registration = await navigator.serviceWorker.ready
      if (enabled) {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) await unsubscribePushRequest(subscription.endpoint)
        setEnabled(false)
      } else {
        await subscribeToPush({
          registration,
          vapidPublicKey,
          requestPermission: () => Notification.requestPermission(),
          request: subscribePushRequest,
        })
        setEnabled(true)
      }
    } catch (error) {
      if (Notification.permission === 'denied') setBlocked(true)
      else showRequestError(error)
    } finally {
      setPending(false)
    }
  }
  const action = enabled ? t('push:disable') : t('push:enable')

  return (
    <>
      {blocked ? (
        <NotificationAlert
          destructive
          title={t('settings:notificationsBlockedTitle')}
          description={t('settings:notificationsBlocked')}
        />
      ) : null}
      <Button
        type="button"
        variant="outline"
        size={settings ? 'default' : 'icon'}
        className="justify-self-start"
        aria-label={action}
        title={action}
        disabled={pending || (blocked && !enabled)}
        onClick={toggle}
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : enabled ? (
          <BellRing aria-hidden="true" />
        ) : (
          <Bell aria-hidden="true" />
        )}
        {settings ? action : null}
      </Button>
    </>
  )
}
