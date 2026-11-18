const urlBase64ToUint8Array = (value: string) => {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const decoded = atob(padded)
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

interface SubscribeOptions {
  registration: ServiceWorkerRegistration
  vapidPublicKey: string
  requestPermission: () => Promise<NotificationPermission>
  request: (subscription: unknown) => Promise<void>
}

export const subscribeToPush = async (options: SubscribeOptions) => {
  if ((await options.requestPermission()) !== 'granted') throw new Error('Permission denied')
  const existing = await options.registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await options.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(options.vapidPublicKey),
    }))
  await options.request(subscription.toJSON())
}
