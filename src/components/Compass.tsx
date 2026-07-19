import { useRef, useEffect, useCallback } from 'react'
import { useBoatStore } from '@/store/boatStore'
import './Compass.css'

// ── Constants ───────────────────────────────────────────────────────────────

const CARDINALS: { label: string; deg: number }[] = [
  { label: 'N',  deg: 0   },
  { label: 'NE', deg: 45  },
  { label: 'E',  deg: 90  },
  { label: 'SE', deg: 135 },
  { label: 'S',  deg: 180 },
  { label: 'SW', deg: 225 },
  { label: 'W',  deg: 270 },
  { label: 'NW', deg: 315 },
]

const DEG_LABELS: number[] = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

function deg2rad(d: number): number {
  return (d * Math.PI) / 180
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function draw(
  ctx: CanvasRenderingContext2D,
  size: number,
  heading: number,
  targetHeading: number,
  headingLock: boolean,
) {
  const cx = size / 2
  const cy = size / 2
  const R  = size / 2 - 2   // outer radius

  ctx.clearRect(0, 0, size, size)

  // ── Background circle ──────────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
  bgGrad.addColorStop(0, '#0d1f3c')
  bgGrad.addColorStop(1, '#06111f')
  ctx.fillStyle = bgGrad
  ctx.fill()

  // Outer bezel ring
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.strokeStyle = '#2a4f7a'
  ctx.lineWidth   = 2
  ctx.stroke()

  // Inner bezel highlight
  ctx.beginPath()
  ctx.arc(cx, cy, R - 3, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(74, 159, 232, 0.15)'
  ctx.lineWidth   = 1
  ctx.stroke()

  // ── Rotating card ─────────────────────────────────────────────────────
  // Everything inside this save/restore is in the rotated frame
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(deg2rad(-heading))   // card rotates opposite to heading

  const tickOuter = R - 4
  const tickInner5 = R - 14       // major tick (every 5°)
  const tickInner10 = R - 20      // labelled tick (every 30°)

  // ── Tick marks ──────────────────────────────────────────────────────
  for (let d = 0; d < 360; d += 5) {
    const rad   = deg2rad(d)
    const isMajor = d % 30 === 0
    const inner = isMajor ? tickInner10 : tickInner5

    ctx.beginPath()
    ctx.moveTo(Math.sin(rad) * tickOuter, -Math.cos(rad) * tickOuter)
    ctx.lineTo(Math.sin(rad) * inner,     -Math.cos(rad) * inner)
    ctx.strokeStyle = isMajor ? 'rgba(74,159,232,0.7)' : 'rgba(74,159,232,0.3)'
    ctx.lineWidth   = isMajor ? 1.5 : 0.8
    ctx.stroke()
  }

  // ── Degree number labels (every 30°) ────────────────────────────────
  const labelR = R - 28
  ctx.font      = `bold ${Math.max(8, size * 0.065)}px Courier New, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  DEG_LABELS.forEach((d) => {
    const rad = deg2rad(d)
    const x   = Math.sin(rad) * labelR
    const y   = -Math.cos(rad) * labelR

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(deg2rad(d))   // keep label upright in rotated frame
    ctx.fillStyle = 'rgba(74,159,232,0.55)'
    ctx.fillText(String(d), 0, 0)
    ctx.restore()
  })

  // ── Cardinal labels ──────────────────────────────────────────────────
  const cardR    = R - 44
  const cardSize = Math.max(10, size * 0.095)
  ctx.font = `bold ${cardSize}px Courier New, monospace`

  CARDINALS.forEach(({ label, deg }) => {
    const rad = deg2rad(deg)
    const x   = Math.sin(rad) * cardR
    const y   = -Math.cos(rad) * cardR

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(deg2rad(deg))

    // N gets special treatment — bright white
    const isNorth = label === 'N'
    ctx.fillStyle = isNorth ? '#ffffff' : 'rgba(232, 240, 254, 0.8)'
    if (isNorth) {
      // Red N — traditional compass style
      ctx.fillStyle = '#e53e3e'
    }
    ctx.fillText(label, 0, 0)
    ctx.restore()
  })

  // ── Target heading marker (shown when heading lock is active) ────────
  if (headingLock) {
    const targetOffset = targetHeading - heading  // angle relative to current card
    const tRad = deg2rad(targetOffset)
    const tx   = Math.sin(tRad) * (R - 6)
    const ty   = -Math.cos(tRad) * (R - 6)

    // Diamond marker
    const dm = 6
    ctx.save()
    ctx.translate(tx, ty)
    ctx.rotate(tRad)
    ctx.beginPath()
    ctx.moveTo(0, -dm)
    ctx.lineTo(dm * 0.6, 0)
    ctx.lineTo(0, dm)
    ctx.lineTo(-dm * 0.6, 0)
    ctx.closePath()
    ctx.fillStyle   = '#48bb78'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth   = 0.5
    ctx.stroke()
    ctx.restore()
  }

  ctx.restore()  // end rotating frame

  // ── Fixed lubber line (always points forward = top) ─────────────────
  // Triangle notch pointing inward from the top
  const lw = 8
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx, cy - R + 1)
  ctx.lineTo(cx - lw, cy - R + lw * 1.8)
  ctx.lineTo(cx + lw, cy - R + lw * 1.8)
  ctx.closePath()
  ctx.fillStyle   = '#4a9fe8'
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth   = 1
  ctx.stroke()
  ctx.restore()

  // ── Centre dot ────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#4a9fe8'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, 2, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
}

// ── Component ────────────────────────────────────────────────────────────────

interface CompassProps {
  size?: number   // diameter in px (default 120)
}

export function Compass({ size = 120 }: CompassProps) {
  const heading       = useBoatStore((s) => s.telemetry.heading)
  const targetHeading = useBoatStore((s) => s.telemetry.targetHeading)
  const headingLock   = useBoatStore((s) => s.telemetry.headingLock)
  const canvasRef     = useRef<HTMLCanvasElement>(null)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // HiDPI / retina support
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width  = size * dpr
      canvas.height = size * dpr
      canvas.style.width  = `${size}px`
      canvas.style.height = `${size}px`
      ctx.scale(dpr, dpr)
    }

    draw(ctx, size, heading, targetHeading, headingLock)
  }, [size, heading, targetHeading, headingLock])

  useEffect(() => {
    redraw()
  }, [redraw])

  return (
    <div className="compass-wrap">
      <canvas ref={canvasRef} className="compass-canvas" />
    </div>
  )
}
