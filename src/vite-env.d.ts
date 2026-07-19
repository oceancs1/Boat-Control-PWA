/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  __swUpdateAvailable?: boolean
  __swUpdate?: (reloadPage?: boolean) => Promise<void>
}
