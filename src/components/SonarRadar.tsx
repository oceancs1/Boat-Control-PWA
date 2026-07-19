import { useRef, useEffect, useCallback } from 'react'
import { useBoatStore } from '@/store/boatStore'
import './SonarRadar.css'

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_RANGE_CM  = 300          // display range (3 m)
const SWEEP_HALF    = 60           // degrees either side of centre
const NUM_READINGS  = 13           // -60° to +60° in 10° steps
const RING_COUNT    = 4            // concentric range rings
const BG_COLOR      = '#06111f'    // slightly lighter than page bg for contrast

// Bearing for reading index i: -60, -50, … 0 … +50, +60
function bearingOf(i: number): number {
  return -SWEEP_HALF + i * (SWEEP_HALF * 2 / (NUM_READINGS - 1))
}

// Convert polar (bearing in °, distance 0-1) → canvas pixel [x, y]
// Origin = boat position (cx, cy). Forward = up.
function polar(bearing: number, dist: number, cx: number, cy: number, maxR: number): [number, number] {
  const rad = (bearing * Math.PI) / 180
  const r   = dist * maxR
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function draw(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  sonar: number[],
) {
  ctx.clearRect(0, 0, W, H)

  // Boat sits near the bottom-centre; radar arc fills above it
  const cx   = W / 2
  const cy   = H * 0.92
  const maxR = Math.min(W * 0.46, cy * 0.95)

  // ── Background sector fill ────────────────────────────────────────────
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  const startRad = ((-SWEEP_HALF - 90) * Math.PI) / 180
  const endRad   = ((SWEEP_HALF  - 90) * Math.PI) / 180
  ctx.arc(cx, cy, maxR, startRad, endRad)
  ctx.closePath()
  ctx.fillStyle = BG_COLOR
  ctx.fill()
  ctx.restore()

  // ── Range rings ───────────────────────────────────────────────────────
  for (let ring = 1; ring <= RING_COUNT; ring++) {
    const r = (ring / RING_COUNT) * maxR
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, startRad, endRad)
    ctx.strokeStyle = `rgba(0, 255, 136, ${ring === RING_COUNT ? 0.25 : 0.12})`
    ctx.lineWidth   = ring === RING_COUNT ? 1.5 : 1
    ctx.setLineDash([4, 6])
    ctx.stroke()
    ctx.restore()

    // Range label on the forward (0°) spoke
    const labelY = cy - r
    ctx.font      = '9px Courier New, monospace'
    ctx.fillStyle = 'rgba(0, 255, 136, 0.45)'
    ctx.textAlign = 'left'
    ctx.fillText(`${Math.round((ring / RING_COUNT) * MAX_RANGE_CM)}cm`, cx + 4, labelY - 2)
  }

  // ── Bearing spokes ────────────────────────────────────────────────────
  for (let deg = -SWEEP_HALF; deg <= SWEEP_HALF; deg += 10) {
    const [ex, ey] = polar(deg, 1, cx, cy, maxR)
    const isMajor  = deg % 30 === 0
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    ctx.strokeStyle = isMajor
      ? 'rgba(0, 255, 136, 0.25)'
      : 'rgba(0, 255, 136, 0.09)'
    ctx.lineWidth   = isMajor ? 1 : 0.5
    ctx.setLineDash([])
    ctx.stroke()

    // Degree labels on major spokes
    if (isMajor && deg !== 0) {
      ctx.font      = '8px Courier New, monospace'
      ctx.fillStyle = 'rgba(0, 255, 136, 0.45)'
      ctx.textAlign = 'center'
      ctx.fillText(`${deg}°`, ex + (deg < 0 ? -8 : 8), ey + 4)
    }
  }

  // Forward label
  ctx.font      = '8px Courier New, monospace'
  ctx.fillStyle = 'rgba(0, 255, 136, 0.55)'
  ctx.textAlign = 'center'
  ctx.fillText('FWD', cx, cy - maxR - 6)

  // ── Build echo points ─────────────────────────────────────────────────
  const readings = sonar.length === NUM_READINGS ? sonar : Array(NUM_READINGS).fill(0)
  const echoPts: [number, number][] = readings.map((cm, i) => {
    // Treat 0 (no echo) as max range
    const dist = cm > 0 ? Math.min(cm, MAX_RANGE_CM) / MAX_RANGE_CM : 1
    return polar(bearingOf(i), dist, cx, cy, maxR)
  })

  // ── Filled detection polygon ─────────────────────────────────────────
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  echoPts.forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.closePath()

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
  grad.addColorStop(0,   'rgba(0, 255, 136, 0.05)')
  grad.addColorStop(0.6, 'rgba(0, 255, 136, 0.12)')
  grad.addColorStop(1,   'rgba(0, 255, 136, 0.04)')
  ctx.fillStyle = grad
  ctx.fill()

  // Polygon outline
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)'
  ctx.lineWidth   = 1.5
  ctx.setLineDash([])
  ctx.stroke()
  ctx.restore()

  // ── Echo dots at each bearing ─────────────────────────────────────────
  readings.forEach((cm, i) => {
    if (cm <= 0) return   // no echo — skip dot
    const dist = Math.min(cm, MAX_RANGE_CM) / MAX_RANGE_CM
    const [x, y] = polar(bearingOf(i), dist, cx, cy, maxR)
    const proximity = 1 - dist  // 0=far, 1=very close
    const dotR = 3 + proximity * 4

    ctx.beginPath()
    ctx.arc(x, y, dotR, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0, 255, 136, ${0.5 + proximity * 0.5})`
    ctx.fill()

    // Bright halo for close objects
    if (proximity > 0.5) {
      ctx.beginPath()
      ctx.arc(x, y, dotR + 3, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(0, 255, 136, ${(proximity - 0.5) * 0.6})`
      ctx.lineWidth   = 1
      ctx.stroke()
    }
  })

  // ── Boat indicator ────────────────────────────────────────────────────
  const bSize = 7
  ctx.beginPath()
  ctx.moveTo(cx,         cy - bSize * 1.6)  // bow
  ctx.lineTo(cx + bSize, cy + bSize)
  ctx.lineTo(cx,         cy + bSize * 0.4)
  ctx.lineTo(cx - bSize, cy + bSize)
  ctx.closePath()
  ctx.fillStyle   = '#4a9fe8'
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth   = 0.8
  ctx.stroke()
}

// ── Component ────────────────────────────────────────────────────────────────

interface SonarRadarProps {
  maxRangeCm?: number
}

export function SonarRadar(_props: SonarRadarProps) {
  const sonar     = useBoatStore((s) => s.telemetry.sonar)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return

    const W = wrap.clientWidth
    const H = wrap.clientHeight
    if (W === 0 || H === 0) return

    // Only resize the backing store when dimensions actually change
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W
      canvas.height = H
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    draw(ctx, W, H, sonar)
  }, [sonar])

  // Redraw whenever sonar data changes
  useEffect(() => {
    redraw()
  }, [redraw])

  // Redraw on container resize
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(redraw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [redraw])

  return (
    <div className="sonar-radar" ref={wrapRef}>
      <canvas ref={canvasRef} className="sonar-radar__canvas" />
      {/* Animated sweep line overlay */}
      <div className="sonar-radar__sweep" aria-hidden="true">
        <div className="sonar-radar__sweep-inner" />
      </div>
      <div className="sonar-radar__legend">
        MAX {MAX_RANGE_CM} cm
      </div>
    </div>
  )
}
