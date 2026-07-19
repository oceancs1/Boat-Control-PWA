import { useBoatStore } from '@/store/boatStore'

// ── Battery indicator ───────────────────────────────────────────────────────

function batteryColor(pct: number): string {
  if (pct > 60) return 'var(--success)'
  if (pct > 30) return 'var(--warning)'
  return 'var(--danger)'
}

export function BatteryIndicator() {
  const isConnected = useBoatStore((s) => s.connectionStatus === 'connected')
  const pct         = useBoatStore((s) => s.telemetry.batteryPercent)
  const volts       = useBoatStore((s) => s.telemetry.batteryVoltage)

  if (!isConnected) {
    return (
      <span className="status-indicator" title="Battery">
        <BatteryIcon pct={0} color="var(--text-dim)" />
        <span style={{ color: 'var(--text-dim)' }}>--</span>
      </span>
    )
  }

  const color = batteryColor(pct)
  return (
    <span className="status-indicator" title={`${volts.toFixed(2)} V`}>
      <BatteryIcon pct={pct} color={color} />
      <span style={{ color }}>{pct}%</span>
    </span>
  )
}

function BatteryIcon({ pct, color }: { pct: number; color: string }) {
  const fillW = Math.max(0, Math.min(1, pct / 100)) * 10
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
      {/* Body */}
      <rect x="0.5" y="0.5" width="16" height="11" rx="2" stroke={color} strokeWidth="1.2" />
      {/* Positive terminal */}
      <rect x="17" y="3.5" width="2.5" height="5" rx="1" fill={color} />
      {/* Fill */}
      <rect x="2" y="2" width={fillW} height="8" rx="1" fill={color} />
    </svg>
  )
}

// ── WiFi signal indicator ───────────────────────────────────────────────────

function rssiToBars(rssi: number): number {
  if (rssi >= -50) return 4
  if (rssi >= -60) return 3
  if (rssi >= -70) return 2
  return 1
}

export function WifiIndicator() {
  const isConnected = useBoatStore((s) => s.connectionStatus === 'connected')
  const rssi        = useBoatStore((s) => s.telemetry.wifiRSSI)

  if (!isConnected) {
    return (
      <span className="status-indicator" title="Wi-Fi RSSI">
        <WifiBars bars={0} />
        <span style={{ color: 'var(--text-dim)' }}>--</span>
      </span>
    )
  }

  const bars = rssiToBars(rssi)
  return (
    <span className="status-indicator" title={`${rssi} dBm`}>
      <WifiBars bars={bars} />
      <span style={{ color: 'var(--text-muted)' }}>{rssi}</span>
    </span>
  )
}

function WifiBars({ bars }: { bars: number }) {
  const heights = [3, 5, 7, 9]
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 4}
          y={10 - h}
          width="3"
          height={h}
          rx="0.5"
          fill={i < bars ? 'var(--accent-light)' : 'var(--border-light)'}
        />
      ))}
    </svg>
  )
}
