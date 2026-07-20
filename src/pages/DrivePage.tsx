import { useRef, useCallback, useState } from 'react'
import { useBoatStore } from '@/store/boatStore'
import { boatWS } from '@/services/boatWebSocket'
import './DrivePage.css'

// ============================================================
//  VerticalSlider
//  A custom touch-friendly vertical slider (0 – 255).
//  Uses pointer events + setPointerCapture so dragging works
//  even when the finger moves outside the track.
// ============================================================

interface SliderProps {
  value: number
  onChange: (v: number) => void
  label: string
}

function VerticalSlider({ value, onChange, label }: SliderProps) {
  const trackRef   = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Convert a clientY screen coordinate to a 0–255 value.
  // 0 is at the bottom of the track, 255 is at the top.
  const valueFromY = useCallback((clientY: number): number => {
    const track = trackRef.current
    if (!track) return value
    const rect = track.getBoundingClientRect()
    const ratio = 1 - (clientY - rect.top) / rect.height
    return Math.round(Math.max(0, Math.min(255, ratio * 255)))
  }, [value])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    onChange(valueFromY(e.clientY))
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    onChange(valueFromY(e.clientY))
  }

  function onPointerUp() {
    isDragging.current = false
  }

  const pct = (value / 255) * 100   // 0–100 for CSS percentage

  return (
    <div className="vslider">
      <div
        className="vslider__track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Blue fill from the bottom up */}
        <div className="vslider__fill" style={{ height: `${pct}%` }} />
        {/* Draggable thumb */}
        <div className="vslider__thumb" style={{ bottom: `${pct}%` }} />
      </div>
      <div className="vslider__value">{value}</div>
      <div className="vslider__label">{label}</div>
    </div>
  )
}

// ============================================================
//  DrivePage — the only screen in the app
// ============================================================

export default function DrivePage() {
  const { connectionStatus, heading, distance } = useBoatStore()

  // Motor slider values (0–255), held in local state
  const [leftPWM,  setLeftPWM]  = useState(0)
  const [rightPWM, setRightPWM] = useState(0)

  // Heading hold toggle — local state, sent to Arduino on each change
  const [headingHoldOn, setHeadingHoldOn] = useState(false)

  const connected = connectionStatus === 'connected'

  // ── Send a complete motor command to the Arduino ────────────────────────────
  function sendCommand(left: number, right: number, hold: boolean) {
    boatWS.sendCommand(left, right, hold)
  }

  // ── Slider handlers ─────────────────────────────────────────────────────────
  function handleLeft(v: number) {
    setLeftPWM(v)
    sendCommand(v, rightPWM, headingHoldOn)
  }

  function handleRight(v: number) {
    setRightPWM(v)
    sendCommand(leftPWM, v, headingHoldOn)
  }

  // ── Heading hold toggle ─────────────────────────────────────────────────────
  function handleHeadingHold() {
    const next = !headingHoldOn
    setHeadingHoldOn(next)
    sendCommand(leftPWM, rightPWM, next)
  }

  // ── Stop — zero both sliders and turn off heading hold ──────────────────────
  function handleStop() {
    setLeftPWM(0)
    setRightPWM(0)
    setHeadingHoldOn(false)
    sendCommand(0, 0, false)
  }

  // ── Connection status pill ──────────────────────────────────────────────────
  const connLabel =
    connectionStatus === 'connected'  ? 'Connected'    :
    connectionStatus === 'connecting' ? 'Connecting…'  :
                                        'Disconnected'

  return (
    <div className="drive-page">

      {/* ═══════════════════════════════════════════════════════
          UPPER HALF — telemetry display
      ═══════════════════════════════════════════════════════ */}
      <div className="telemetry-panel">

        {/* WiFi status pill */}
        <div className={`wifi-pill wifi-pill--${connectionStatus}`}>
          {/* WiFi icon (SVG arcs) */}
          <svg className="wifi-icon" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
          </svg>
          <span>{connLabel}</span>
        </div>

        {/* Compass heading */}
        <div className="telemetry-group">
          <span className="telemetry-label">HEADING</span>
          <span className="telemetry-value telemetry-value--heading">
            {connected ? `${heading.toFixed(1)}°` : '--°'}
          </span>
        </div>

        {/* Sonar distance */}
        <div className="telemetry-group">
          <span className="telemetry-label">DISTANCE</span>
          <span className="telemetry-value telemetry-value--distance">
            {connected ? `${distance} cm` : '-- cm'}
          </span>
        </div>

      </div>

      {/* Dividing line between the two halves */}
      <div className="half-divider" />

      {/* ═══════════════════════════════════════════════════════
          LOWER HALF — motor controls
      ═══════════════════════════════════════════════════════ */}
      <div className="controls-panel">

        <VerticalSlider value={leftPWM}  onChange={handleLeft}  label="LEFT"  />

        <div className="center-controls">
          <button
            className={`btn btn--hold ${headingHoldOn ? 'btn--hold-active' : ''}`}
            onClick={handleHeadingHold}
          >
            {headingHoldOn ? 'HOLD ON' : 'HEADING HOLD'}
          </button>
          <button className="btn btn--stop" onClick={handleStop}>
            STOP
          </button>
        </div>

        <VerticalSlider value={rightPWM} onChange={handleRight} label="RIGHT" />

      </div>
    </div>
  )
}
