// Central configuration — update host/port here to change the WebSocket target
export const WS_HOST = '192.168.4.1'
export const WS_PORT = 81
export const WS_URL = `ws://${WS_HOST}:${WS_PORT}`

export const PROTOCOL_VERSION = 1
export const HEARTBEAT_INTERVAL_MS = 150
export const TELEMETRY_INTERVAL_MS = 100
export const RECONNECT_DELAY_MS = 2000

export const PWA_VERSION = '1.0.0'
// Firmware version is reported via telemetry from the Arduino
