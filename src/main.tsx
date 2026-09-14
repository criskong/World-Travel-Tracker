import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { captureInstallPrompt } from './hooks/useInstallPrompt'
import './index.css'

// Prima di tutto: `beforeinstallprompt` arriva una volta sola, poco dopo il
// caricamento, e chi non e in ascolto in quel momento non lo vede piu.
captureInstallPrompt()

const container = document.getElementById('root')
if (!container) {
  throw new Error('Elemento #root non trovato in index.html')
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
