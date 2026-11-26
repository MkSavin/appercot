import '../src/shared/config/i18n'
import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { useTranslation } from 'react-i18next'
import { i18n } from '../src/shared/config/i18n'

const Translated = () => {
  const { t } = useTranslation()
  return <h1>{t('chat:title')}</h1>
}

test('loads Russian JSON namespaces through react-i18next', () => {
  expect(i18n.t('global:appName')).toBe('appercot')
  expect(i18n.t('chat:title')).toBe('Чаты')
  expect(i18n.t('chat:unread', { count: 3 })).toBe('Непрочитанных: 3')
  expect(i18n.hasResourceBundle('ru', 'commandPalette')).toBe(true)
  expect(i18n.hasResourceBundle('ru', 'common')).toBe(true)
  expect(renderToStaticMarkup(<Translated />)).toBe('<h1>Чаты</h1>')
})

test('loads English feature namespaces with Russian fallback for untranslated resources', async () => {
  await i18n.changeLanguage('en')
  try {
    expect(i18n.t('onboarding:title')).toBe('Launch your first bot')
    expect(i18n.t('onboarding:steps.connect')).toBe('SDK connected')
    expect(i18n.t('chat:retry')).toBe('Retry')
    expect(i18n.t('message:failed')).toBe('Not sent')
    expect(i18n.t('upload:status.completing')).toBe('Finishing the upload on the server…')
    expect(i18n.t('browse:details.startChat')).toBe('Start chat')
    expect(i18n.t('bot:notificationsMutePreset.1h')).toBe('For 1 hour')
    expect(i18n.t('settings:notificationsPerChatHint')).toContain('each chat')
    expect(i18n.t('common:retry')).toBe('Retry')
    expect(i18n.t('chat:messageSearch.placeholder')).toBe('Search in this chat')
    expect(i18n.t('chat:messageSearch.resultsCount', { count: 2 })).toBe('Messages found: 2')
    expect(i18n.t('chat:title')).toBe('Чаты')
  } finally {
    await i18n.changeLanguage('ru')
  }
})
