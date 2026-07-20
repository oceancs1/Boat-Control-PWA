import { WS_URL, RECONNECT_DELAY_MS } from '@/config'
import { useBoatStore } from '@/store/boatStore'

// ── Incoming telemetry from Arduino ─────────────────────────────────────────
// { "heading": 124.6, "distance": 82, "headingHold": true }

// ── Outgoing command to Arduino ──────────────────────────────────────────────
// { "leftMotor": 180, "rightMotor": 205, "headingHold": true }

class BoatWebSocketService {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldConnect = false

  // ── Public API ─────────────────────────────────────────────────────────────

  start(): void {
    this.shouldConnect = true
    this.connect()
  }

  stop(): void {
    this.shouldConnect = false
    this.clearReconnect()
    this.ws?.close()
    this.ws = null
    useBoatStore.getState().setConnectionStatus('disconnected')
  }

  /** Send a motor + heading-hold command to the Arduino. */
  sendCommand(leftMotor: number, rightMotor: number, headingHold: boolean): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ leftMotor, rightMotor, headingHold }))
  }

  // ── Connection management ──────────────────────────────────────────────────

  private connect(): void {
    if (!this.shouldConnect) return
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return

    useBoatStore.getState().setConnectionStatus('connecting')

    try {
      this.ws = new WebSocket(WS_URL)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      useBoatStore.getState().setConnectionStatus('connected')
    }

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data as string) as Record<string, unknown>
        if (typeof d.heading === 'number' && typeof d.distance === 'number') {
          useBoatStore.getState().setTelemetry(
            d.heading as number,
            d.distance as number,
          )
        }
      } catch {
        // Ignore malformed packets
      }
    }

    this.ws.onerror = () => {
      // onclose always fires after onerror — reconnect is handled there
    }

    this.ws.onclose = () => {
      useBoatStore.getState().setConnectionStatus('disconnected')
      this.ws = null
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldConnect) return
    this.clearReconnect()
    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS)
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

// Single shared instance used across the whole app
export const boatWS = new BoatWebSocketService()
