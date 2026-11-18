import { Bell, BellRing, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { subscribePushRequest } from '@/entities/session'
import { showRequestError } from '@/shared/api'
import { strings } from '@/shared/config'
import { Button } from '@/shared/ui/button'
import { subscribeToPush } from '../model/subscribe'

export const PushSubscribeButton = ({ vapidPublicKey }: { vapidPublicKey: string | null }) => {
  const [pending, setPending] = useState(false)
  const [enabled, setEnabled] = useState(false)
  if (!vapidPublicKey) return null

  const subscribe = async () => {
    setPending(true)
    try {
      const registration = await navigator.serviceWorker.ready
      await subscribeToPush({
        registration,
        vapidPublicKey,
        requestPermission: () => Notification.requestPermission(),
        request: subscribePushRequest,
      })
      setEnabled(true)
    } catch (error) {
      showRequestError(error)
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-muted-foreground"
      aria-label={enabled ? strings.push.enabled : strings.push.enable}
      title={enabled ? strings.push.enabled : strings.push.enable}
      disabled={pending || enabled}
      onClick={subscribe}
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" />
      ) : enabled ? (
        <BellRing aria-hidden="true" />
      ) : (
        <Bell aria-hidden="true" />
      )}
    </Button>
  )
}
