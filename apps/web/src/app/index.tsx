import { createRoot } from 'react-dom/client'
import { AppProviders } from './composition/AppProviders'
import { AppRouter } from './routing'
import './styles/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element is missing')
}

createRoot(rootElement).render(
  <AppProviders>
    <AppRouter />
  </AppProviders>,
)
