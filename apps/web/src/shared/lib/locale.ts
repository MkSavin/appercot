export const supportedLocales = ['ru', 'en'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

export const localeStorageKey = 'appercot:locale:v1'

export const isSupportedLocale = (value: unknown): value is SupportedLocale =>
  supportedLocales.includes(value as SupportedLocale)

export const normalizeLocale = (value: unknown): SupportedLocale =>
  isSupportedLocale(value) ? value : 'ru'

export const getLocalePreference = (): SupportedLocale => {
  try {
    return normalizeLocale(localStorage.getItem(localeStorageKey))
  } catch {
    return 'ru'
  }
}

export const saveLocalePreference = (locale: SupportedLocale) => {
  try {
    localStorage.setItem(localeStorageKey, locale)
  } catch {
    return
  }
}

export const applyDocumentLocale = (locale: SupportedLocale) => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = 'ltr'
}
