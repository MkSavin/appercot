/// <reference lib="webworker" />

import { PushPayloadSchema } from '@appercot/protocol'
import { openChatFromNotification } from '@/shared/lib/notification'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string }>
}

const cacheName = 'appercot-shell-v1'
const precacheUrls = self.__WB_MANIFEST.map((entry) => entry.url)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.addAll(precacheUrls))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request)
      if (cached) return cached
      try {
        return await fetch(event.request)
      } catch (error) {
        if (event.request.mode === 'navigate') {
          const shell = await caches.match('/index.html')
          if (shell) return shell
        }
        throw error
      }
    })(),
  )
})

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      if (!event.data) return
      const payload = PushPayloadSchema.parse(event.data.json())
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        data: { url: payload.url },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const result = PushPayloadSchema.pick({ url: true }).safeParse(event.notification.data)
  if (!result.success) return
  const url = result.data.url
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      await openChatFromNotification(windows, url, self.location.origin, (target) =>
        self.clients.openWindow(target),
      )
    })(),
  )
})
