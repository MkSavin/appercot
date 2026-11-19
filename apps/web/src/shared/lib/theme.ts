export type ThemePreference = 'system' | 'light' | 'dark'

const storageKey = 'appercot:theme'

export const getThemePreference = (): ThemePreference => {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

export const applyTheme = (preference: ThemePreference) => {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export const saveThemePreference = (preference: ThemePreference) => {
  applyTheme(preference)
  try {
    localStorage.setItem(storageKey, preference)
  } catch {
    return
  }
}
