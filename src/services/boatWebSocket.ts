import { HEARTBEAT_INTERVAL_MS, RECONNECT_DELAY_MS, PROTOCOL_VERSION } from '@/config'
import { useBoatStore } from '@/store/boatStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { OutgoingMessage, TelemetryMessage } from '@/types/protocol'

// ── Singleton WebSocket service ─────────────────────────────────────────────
//
// Lives for the lifetime of the app. Manages:
//   - WebSocket connection open/close/error
//   - Heartbeat timer (sends every HEARTBEAT_INTERVAL_MS)
//   - Automatic reconnection after disconnect
//   - JSON message parsing and store updates

class BoatWebSocketService {
  private ws: WebSocket | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldConnect = false

  // ── Public API ────────────────────────────────────────────────────────────

  start(): void {
    this.shouldConnect = true
    this.connect()
  }

  /** Disconnect, then reconnect to the current settings URL (e.g. after host/port change). */
  reconnect(): void {
    this.clearTimers()
    if (this.ws) {
      this.ws.onclose = null   // suppress the auto-reconnect from the old socket
      this.ws.close()
      this.ws = null
    }
    useBoatStore.getState().setConnectionStatus('disconnected')
    useBoatStore.getState().resetMotors()
    if (this.shouldConnect) this.connect()
  }

  stop(): void {
    this.shouldConnect = false
    this.clearTimers()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    useBoatStore.getState().setConnectionStatus('disconnected')
  }

  send(message: OutgoingMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      return true
    }
    return false
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // ── Connection management ─────────────────────────────────────────────────

  private connect(): void {
    if (!this.shouldConnect) return
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return

    useBoatStore.getState().setConnectionStatus('connecting')

    const url = useSettingsStore.getState().getWsUrl()
    try {
      this.ws = new WebSocket(url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      useBoatStore.getState().setConnectionStatus('connected')
      this.startHeartbeat()
    }

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data as string)
    }

    this.ws.onerror = () => {
      // onclose always fires after onerror, so reconnect is handled there
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      useBoatStore.getState().setConnectionStatus('disconnected')
      useBoatStore.getState().resetMotors()
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldConnect) return
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS)
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send({ protocolVersion: PROTOCOL_VERSION, type: 'heartbeat' })
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ── Message parsing ───────────────────────────────────────────────────────

  private handleMessage(raw: string): void {
    let msg: unknown
    try {
      msg = JSON.parse(raw)
    } catch {
      console.warn('[WS] Invalid JSON received:', raw)
      return
    }

    if (typeof msg !== 'object' || msg === null) return

    const packet = msg as Record<string, unknown>
    if (packet['protocolVersion'] !== PROTOCOL_VERSION) return

    if (packet['type'] === 'telemetry') {
      useBoatStore.getState().setTelemetry(packet as unknown as TelemetryMessage)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private clearTimers(): void {
    this.stopHeartbeat()
    this.clearReconnectTimer()
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

// Export a single shared instance
export const boatWS = new BoatWebSocketService()
