import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'

// Register service worker with update prompt
const updateSW = registerSW({
  onNeedRefresh() {
    // Expose the update function so App can display the update banner
    window.__swUpdateAvailable = true
    window.__swUpdate = updateSW
    window.dispatchEvent(new Event('sw-update-available'))
  },
  onOfflineReady() {
    console.info('[SW] App ready for offline use')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
