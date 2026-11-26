import { afterEach, describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { useTranslation } from 'react-i18next'
import { i18n, localeResources } from '../src/shared/config/i18n'
import { formatDate } from '../src/shared/lib/format-date'
import {
  getLocalePreference,
  localeStorageKey,
  normalizeLocale,
  saveLocalePreference,
} from '../src/shared/lib/locale'

const Translated = () => {
  const { t } = useTranslation()
  return <h1>{t('chat:title')}</h1>
}

type Resource = string | { [key: string]: Resource }

const leaves = (resource: Resource, prefix = ''): Array<[string, string]> =>
  Object.entries(resource).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string' ? [[path, value]] : leaves(value, path)
  })

const canonicalKey = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '')
const variables = (value: string) =>
  [...value.matchAll(/{{\s*([^}\s]+)\s*}}/g)].map((match) => match[1]).sort()

afterEach(async () => {
  await i18n.changeLanguage('ru')
})

describe('locale resources', () => {
  test('loads Russian JSON namespaces through react-i18next by default', () => {
    expect(normalizeLocale(undefined)).toBe('ru')
    expect(normalizeLocale('en-US')).toBe('ru')
    expect(i18n.t('global:appName')).toBe('appercot')
    expect(i18n.t('chat:title')).toBe('Чаты')
    expect(renderToStaticMarkup(<Translated />)).toBe('<h1>Чаты</h1>')
  })

  test('mirrors every namespace and plural-aware leaf key in English', () => {
    expect(Object.keys(localeResources.en).sort()).toEqual(Object.keys(localeResources.ru).sort())
    for (const namespace of Object.keys(localeResources.ru)) {
      const russian = leaves(localeResources.ru[namespace as keyof typeof localeResources.ru])
      const english = leaves(localeResources.en[namespace as keyof typeof localeResources.en])
      expect([...new Set(english.map(([key]) => canonicalKey(key)))].sort(), namespace).toEqual(
        [...new Set(russian.map(([key]) => canonicalKey(key)))].sort(),
      )
      const englishByKey = new Map(english)
      for (const [key, value] of russian) {
        const translated = englishByKey.get(key)
        if (!translated) continue
        expect(variables(translated), `${namespace}:${key}`).toEqual(variables(value))
      }
      for (const [key, value] of [...russian, ...english]) {
        expect(value.trim(), `${namespace}:${key}`).not.toBe('')
        expect(value, `${namespace}:${key}`).not.toMatch(/TODO/i)
      }
      for (const [key, value] of english) {
        expect(value, `${namespace}:${key}`).not.toMatch(/[А-Яа-яЁё]/)
      }
    }
  })

  test('uses Russian and English plural categories with numeric counts', async () => {
    const russian = new Map([
      [1, 'Нет связи. 1 сообщение будет отправлено после восстановления связи.'],
      [2, 'Нет связи. 2 сообщения будут отправлены после восстановления связи.'],
      [5, 'Нет связи. 5 сообщений будут отправлены после восстановления связи.'],
      [21, 'Нет связи. 21 сообщение будет отправлено после восстановления связи.'],
      [22, 'Нет связи. 22 сообщения будут отправлены после восстановления связи.'],
      [25, 'Нет связи. 25 сообщений будут отправлены после восстановления связи.'],
    ])
    for (const [count, expected] of russian) {
      expect(i18n.t('chat:offlineOutbox', { count })).toBe(expected)
    }
    await i18n.changeLanguage('en')
    expect(i18n.t('chat:offlineOutbox', { count: 1 })).toBe(
      'No connection. 1 message will be sent when the connection returns.',
    )
    expect(i18n.t('chat:offlineOutbox', { count: 2 })).toBe(
      'No connection. 2 messages will be sent when the connection returns.',
    )
  })

  test('switches React and shared translations without Russian feature fallback', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('chat:title')).toBe('Chats')
    expect(i18n.t('auth:signInTitle')).toBe('Welcome back')
    expect(i18n.t('account:profile')).toBe('Personal details')
    expect(i18n.t('admin:title')).toBe('Administration')
    expect(i18n.t('commandPalette:title')).toBe('Chat commands')
    expect(i18n.t('onboarding:title')).toBe('Launch your first bot')
    expect(i18n.t('message:failed')).toBe('Not sent')
    expect(i18n.t('upload:status.completing')).toBe('Finishing the upload on the server…')
    expect(i18n.t('browse:details.startChat')).toBe('Start chat')
    expect(i18n.t('settings:language')).toBe('Language')
    expect(renderToStaticMarkup(<Translated />)).toBe('<h1>Chats</h1>')
  })

  test('formats dates using the active locale without changing the timestamp', () => {
    const timestamp = Date.UTC(2026, 10, 26, 12, 30)
    const options = { dateStyle: 'long', timeZone: 'UTC' } as const
    expect(formatDate(timestamp, 'ru', options)).toBe('26 ноября 2026 г.')
    expect(formatDate(timestamp, 'en', options)).toBe('November 26, 2026')
    expect(formatDate(timestamp, 'invalid', options)).toBe('26 ноября 2026 г.')
  })
})

describe('locale preference', () => {
  test('reads valid saved values, rejects invalid values and persists selection', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
    try {
      expect(getLocalePreference()).toBe('ru')
      saveLocalePreference('en')
      expect(values.get(localeStorageKey)).toBe('en')
      expect(getLocalePreference()).toBe('en')
      values.set(localeStorageKey, 'en-US')
      expect(getLocalePreference()).toBe('ru')
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })

  test('continues without persistence when storage is denied', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new DOMException('Denied', 'NotAllowedError')
        },
        setItem: () => {
          throw new DOMException('Denied', 'NotAllowedError')
        },
      },
    })
    try {
      expect(getLocalePreference()).toBe('ru')
      expect(() => saveLocalePreference('en')).not.toThrow()
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })
})
