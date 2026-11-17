import { createRoot } from 'react-dom/client'
import { AppRouter } from './routing'
import './styles/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element is missing')
}

createRoot(rootElement).render(<AppRouter />)
