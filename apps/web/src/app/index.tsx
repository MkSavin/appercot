import { createRoot } from 'react-dom/client'
import { registerServiceWorker } from '@/shared/lib/register-sw'
import { AppProviders } from './composition/AppProviders'
import { AppRouter } from './routing'
import './styles/index.css'

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
