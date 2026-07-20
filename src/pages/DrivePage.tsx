import { useEffect, useRef, useState } from 'react'
import { useBoatStore } from '@/store/boatStore'
import { boatWS } from '@/services/boatWebSocket'
import './DrivePage.css'

// ============================================================
//  VerticalSlider
//  Visuals are driven only through DOM refs so 10 Hz telemetry
//  re-renders (in a sibling) cannot yank the thumb back.
// ============================================================

interface SliderProps {
  value: number
  onChange: (v: number) => void
  label: string
}

// Send motor commands quickly while dragging; keepalive handles held positions.
const COMMIT_INTERVAL_MS = 40
const MOVE_SEND_MS       = 50

function VerticalSlider({ value, onChange, label }: SliderProps) {
  const trackRef      = useRef<HTMLDivElement>(null)
  const fillRef       = useRef<HTMLDivElement>(null)
  const thumbRef      = useRef<HTMLDivElement>(null)
  const valueLabel    = useRef<HTMLDivElement>(null)
  const isDragging       = useRef(false)
  const activePointerId  = useRef<number | null>(null)
  const latestValue      = useRef(value)
  const lastCommitted = useRef(value)
  const lastSendMs    = useRef(0)
  const commitTimer   = useRef<ReturnType<typeof setInterval> | null>(null)

  function applyVisuals(v: number) {
    const pct = (v / 255) * 100
    if (fillRef.current)    fillRef.current.style.height  = `${pct}%`
    if (thumbRef.current)   thumbRef.current.style.bottom = `${pct}%`
    if (valueLabel.current) valueLabel.current.textContent = String(v)
  }

  // Sync from parent only when the user is NOT dragging
  // (e.g. STOP button zeros the sliders).
  useEffect(() => {
    if (isDragging.current) return
    latestValue.current = value
    lastCommitted.current = value
    applyVisuals(value)
  }, [value])

  function valueFromY(clientY: number): number {
    const track = trackRef.current
    if (!track) return latestValue.current
    const rect  = track.getBoundingClientRect()
    const ratio = 1 - (clientY - rect.top) / rect.height
    return Math.round(Math.max(0, Math.min(255, ratio * 255)))
  }

  function commit(force = false) {
    const now = Date.now()
    if (!force && now - lastSendMs.current < MOVE_SEND_MS) return
    if (latestValue.current !== lastCommitted.current || force) {
      lastCommitted.current = latestValue.current
      lastSendMs.current = now
      onChange(latestValue.current)
    }
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) {
      return
    }
    const track = trackRef.current
    if (track && activePointerId.current !== null &&
        track.hasPointerCapture(activePointerId.current)) {
      track.releasePointerCapture(activePointerId.current)
    }
    activePointerId.current = null
    isDragging.current = false
    if (commitTimer.current) {
      clearInterval(commitTimer.current)
      commitTimer.current = null
    }
    commit(true)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    activePointerId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    const v = valueFromY(e.clientY)
    latestValue.current = v
    applyVisuals(v)
    commit(true)

    if (commitTimer.current) clearInterval(commitTimer.current)
    commitTimer.current = setInterval(commit, COMMIT_INTERVAL_MS)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || e.pointerId !== activePointerId.current) return
    const v = valueFromY(e.clientY)
    latestValue.current = v
    applyVisuals(v)
    commit()
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    endDrag(e)
  }

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
        {/* Heights set only via refs — never via React style props */}
        <div className="vslider__fill"  ref={fillRef}  />
        <div className="vslider__thumb" ref={thumbRef} />
      </div>
      <div className="vslider__value" ref={valueLabel}>{value}</div>
      <div className="vslider__label">{label}</div>
    </div>
  )
}

// ============================================================
//  TelemetryPanel — own store subscription so slider drags are
//  not interrupted by heading/distance updates every 100 ms.
// ============================================================

function TelemetryPanel() {
  const { connectionStatus, heading, distance } = useBoatStore()
  const connected = connectionStatus === 'connected'

  const connLabel =
    connectionStatus === 'connected'  ? 'Connected'    :
    connectionStatus === 'connecting' ? 'Connecting…'  :
                                        'Disconnected'

  return (
    <div className="telemetry-panel">
      <div className={`wifi-pill wifi-pill--${connectionStatus}`}>
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

      <div className="telemetry-group">
        <span className="telemetry-label">HEADING</span>
        <span className="telemetry-value telemetry-value--heading">
          {connected ? `${heading.toFixed(1)}°` : '--°'}
        </span>
      </div>

      <div className="telemetry-group">
        <span className="telemetry-label">DISTANCE</span>
        <span className="telemetry-value telemetry-value--distance">
          {connected ? `${distance} cm` : '-- cm'}
        </span>
      </div>
    </div>
  )
}

// ============================================================
//  DrivePage
// ============================================================

export default function DrivePage() {
  const connectionStatus = useBoatStore((s) => s.connectionStatus)
  const [leftPWM,  setLeftPWM]  = useState(0)
  const [rightPWM, setRightPWM] = useState(0)
  const [headingHoldOn, setHeadingHoldOn] = useState(false)

  // Refs so each slider always sends the other motor's latest value
  // without waiting on a React state round-trip.
  const leftRef  = useRef(0)
  const rightRef = useRef(0)
  const holdRef  = useRef(false)

  // Keepalive: re-send current motor values while connected.
  useEffect(() => {
    if (connectionStatus !== 'connected') return
    const id = setInterval(() => {
      boatWS.sendCommand(leftRef.current, rightRef.current, holdRef.current)
    }, 250)
    return () => clearInterval(id)
  }, [connectionStatus])

  function handleLeft(v: number) {
    leftRef.current = v
    setLeftPWM(v)
    boatWS.sendCommand(v, rightRef.current, holdRef.current)
  }

  function handleRight(v: number) {
    rightRef.current = v
    setRightPWM(v)
    boatWS.sendCommand(leftRef.current, v, holdRef.current)
  }

  function handleHeadingHold() {
    const next = !holdRef.current
    holdRef.current = next
    setHeadingHoldOn(next)
    boatWS.sendCommand(leftRef.current, rightRef.current, next)
  }

  function handleStop() {
    leftRef.current = 0
    rightRef.current = 0
    holdRef.current = false
    setLeftPWM(0)
    setRightPWM(0)
    setHeadingHoldOn(false)
    boatWS.sendCommand(0, 0, false)
  }

  return (
    <div className="drive-page">
      <TelemetryPanel />
      <div className="half-divider" />
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
