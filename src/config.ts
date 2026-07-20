// ── WebSocket connection ─────────────────────────────────────────────────────
// The Arduino creates a WiFi Access Point. Its IP is always 192.168.4.1.
// Change WS_HOST here if your setup uses a different address.
export const WS_HOST = '192.168.4.1'
export const WS_PORT = 81
export const WS_URL  = `ws://${WS_HOST}:${WS_PORT}`

// How long to wait before attempting to reconnect after a dropped connection
export const RECONNECT_DELAY_MS = 2000

export const PWA_VERSION = '2.0.0'
