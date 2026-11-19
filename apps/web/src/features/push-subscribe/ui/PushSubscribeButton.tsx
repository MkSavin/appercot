import { Bell, BellRing, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchPushStatus, subscribePushRequest, unsubscribePushRequest } from '@/entities/session'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { subscribeToPush } from '../model/subscribe'

export const PushSubscribeButton = ({
  vapidPublicKey,
  settings = false,
}: {
  vapidPublicKey: string | null
  settings?: boolean
}) => {
  const [pending, setPending] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!vapidPublicKey || !settings) return
    if (!('Notification' in window) || !('PushManager' in window) || !navigator.serviceWorker) {
      setUnavailable(true)
      return
    }
    setBlocked(Notification.permission === 'denied')
    let active = true
    navigator.serviceWorker
      .getRegistration()
      .then(async (registration) => {
        if (!registration) {
          if (active) setUnavailable(true)
          return
        }
        const subscription = await registration.pushManager.getSubscription()
        const subscribed = subscription ? await fetchPushStatus(subscription.endpoint) : false
        if (active) setEnabled(subscribed)
      })
      .catch(() => {
        if (active) setUnavailable(true)
      })
    return () => {
      active = false
    }
  }, [settings, vapidPublicKey])

  if (!vapidPublicKey || unavailable) {
    return settings ? <p className="text-sm">{strings.settings.notificationsUnavailable}</p> : null
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
  const action = enabled ? strings.push.disable : strings.push.enable

  return (
    <>
      {blocked ? (
        <p role="status" className="text-sm">
          {strings.settings.notificationsBlocked}
        </p>
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
