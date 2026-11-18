import { describe, expect, test } from 'bun:test'
import { PushPayloadSchema } from '@appercot/protocol'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServerFixture } from '../../server/test/helpers'
import { subscribeToPush } from '../src/features/push-subscribe/model/subscribe'
import { PushSubscribeButton } from '../src/features/push-subscribe/ui/PushSubscribeButton'
import { openChatFromNotification } from '../src/shared/lib/notification'
import { registerServiceWorker } from '../src/shared/lib/register-sw'

describe('PWA and push subscription', () => {
  test('registers the service worker immediately without waiting for load', async () => {
    let registeredUrl = ''
    await registerServiceWorker(async (url) => {
      registeredUrl = url
      return {} as ServiceWorkerRegistration
    })
    expect(registeredUrl).toBe('/sw.js')
  })

  test('focuses and navigates an existing app window from a notification', async () => {
    const actions: string[] = []
    const existing = {
      url: 'http://localhost:5173/',
      navigate: async (url: string) => {
        actions.push(`navigate:${url}`)
      },
      focus: async () => {
        actions.push('focus')
      },
    }
    await openChatFromNotification(
      [existing],
      '/c/chat-1',
      'http://localhost:5173',
      async (url) => {
        actions.push(`open:${url}`)
      },
    )
    expect(actions).toEqual(['navigate:/c/chat-1', 'focus'])
  })

  test('opens a new app window when no existing window is available', async () => {
    const actions: string[] = []
    await openChatFromNotification([], '/c/chat-2', 'http://localhost:5173', async (url) => {
      actions.push(`open:${url}`)
    })
    expect(actions).toEqual(['open:/c/chat-2'])
  })

  test('accepts only local chat deep links in push payloads', () => {
    expect(
      PushPayloadSchema.parse({
        title: 'Bot',
        body: 'Message',
        tag: 'chat-1',
        url: '/c/chat-1',
      }),
    ).toMatchObject({ url: '/c/chat-1' })
    expect(() =>
      PushPayloadSchema.parse({
        title: 'Bot',
        body: 'Message',
        tag: 'chat-1',
        url: 'https://example.test/steal',
      }),
    ).toThrow()
  })

  test('shows the opt-in button only when push is configured', () => {
    expect(renderToStaticMarkup(<PushSubscribeButton vapidPublicKey="key" />)).toContain(
      'Включить уведомления',
    )
    expect(renderToStaticMarkup(<PushSubscribeButton vapidPublicKey={null} />)).toBe('')
  })

  test('subscribes with a visible-only push subscription and sends it to the server', async () => {
    let subscribeOptions: PushSubscriptionOptions | undefined
    let serverSubscription: unknown
    const subscription = {
      endpoint: 'https://push.example.test/new',
      keys: { p256dh: 'key', auth: 'auth' },
      toJSON: () => subscription,
    } as PushSubscription
    const registration = {
      pushManager: {
        getSubscription: async () => null,
        subscribe: async (options: PushSubscriptionOptions) => {
          subscribeOptions = options
          return subscription
        },
      },
    } as ServiceWorkerRegistration

    await subscribeToPush({
      registration,
      vapidPublicKey:
        'BC1Gb3l2vZvk0l1rQxZ3rF4rJv2fQfRr8m0n7Y5nQ0nQ3m4l2Z0k0n2v0m0n0q0n0v0m0n0q0n0v0m0n0q0n0v0m0n0q0n0v0m0n0q0n0v0m0n0q0n0v0m0n0q0n0v0m0n0q0n0v0m0n0q0n0v0m0n0q0n0',
      requestPermission: async () => 'granted',
      request: async (input) => {
        serverSubscription = input
      },
    })
    expect(subscribeOptions?.userVisibleOnly).toBe(true)
    expect(subscribeOptions?.applicationServerKey).toBeInstanceOf(Uint8Array)
    expect(serverSubscription).toMatchObject({ endpoint: subscription.endpoint })
  })

  test('serves the application with a restrictive CSP', async () => {
    const fixture = createServerFixture()
    try {
      const response = await fetch(`${fixture.baseUrl}/healthz`)
      expect(response.headers.get('content-security-policy')).toContain("default-src 'self'")
      expect(response.headers.get('content-security-policy')).toContain("media-src 'self' blob:")
    } finally {
      fixture.stop()
    }
  })
})
