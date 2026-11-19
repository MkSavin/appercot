import { createRoot } from 'react-dom/client'
import '@/shared/config'
import { registerServiceWorker } from '@/shared/lib/register-sw'
import { applyTheme, getThemePreference } from '@/shared/lib/theme'
import { AppProviders } from './composition/AppProviders'
import { AppRouter } from './routing'
import './styles/index.css'

const syncTheme = () => applyTheme(getThemePreference())
syncTheme()
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme)
window.addEventListener('storage', syncTheme)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void registerServiceWorker()
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element is missing')
}

createRoot(rootElement).render(
  <AppProviders>
    <AppRouter />
  </AppProviders>,
)
