import '../src/shared/config/i18n'
import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PushSubscribeButton } from '../src/features/push-subscribe'
import { NotificationSettings } from '../src/pages/settings/ui/NotificationSettings'

test('distinguishes missing server push configuration from browser support', () => {
  const markup = renderToStaticMarkup(<PushSubscribeButton vapidPublicKey={null} settings />)
  expect(markup).toContain('Push-уведомления не настроены на сервере')
  expect(markup).not.toContain('недоступны в этом браузере или на этом сервере')
})

test('uses a section heading and an alert inside the settings card', () => {
  const markup = renderToStaticMarkup(<NotificationSettings vapidPublicKey={null} />)
  expect(markup).toContain('<h2')
  expect(markup).toContain('Уведомления')
  expect(markup).toContain('settings-card')
  expect(markup).toContain('data-slot="alert"')
  expect(markup).toContain('role="alert"')
})
