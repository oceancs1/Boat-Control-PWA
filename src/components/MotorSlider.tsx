import { useRef, useCallback } from 'react'
import './MotorSlider.css'

interface MotorSliderProps {
  value: number               // 0–100
  onChange: (value: number) => void
  label: string
  disabled?: boolean
}

// Tick positions at 0%, 25%, 50%, 75%, 100%
const TICKS = [0, 25, 50, 75, 100]

export function MotorSlider({ value, onChange, label, disabled = false }: MotorSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  // Compute 0–100 from a clientY position over the track
  const valueFromClientY = useCallback((clientY: number): number => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    // Y=rect.top → 100%, Y=rect.bottom → 0%  (drag up = more power)
    const ratio = 1 - (clientY - rect.top) / rect.height
    return Math.round(Math.max(0, Math.min(1, ratio)) * 100)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    onChange(valueFromClientY(e.clientY))
  }, [disabled, onChange, valueFromClientY])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !(e.buttons & 1)) return
    onChange(valueFromClientY(e.clientY))
  }, [disabled, onChange, valueFromClientY])

  // Prevent context menu on long-press (mobile)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const isHigh = value >= 70

  return (
    <div className="motor-slider">
      <span className="motor-slider__label">{label}</span>

      <div
        ref={trackRef}
        className={`motor-slider__track${disabled ? ' disabled' : ''}`}
        data-power={isHigh ? 'high' : 'normal'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onContextMenu={handleContextMenu}
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        {/* Decorative tick marks */}
        <div className="motor-slider__ticks">
          {TICKS.map((pct) => (
            <div
              key={pct}
              className={`motor-slider__tick${pct % 50 === 0 ? ' motor-slider__tick--major' : ''}`}
              style={{ position: 'absolute', bottom: `${pct}%`, right: 0 }}
            />
          ))}
        </div>

        {/* Power fill (grows from bottom) */}
        <div
          className="motor-slider__fill"
          style={{ height: `${value}%` }}
        />

        {/* Thumb indicator */}
        <div
          className="motor-slider__thumb"
          style={{ bottom: `${value}%` }}
        />
      </div>

      <span className={`motor-slider__value${value === 0 ? ' zero' : ''}`}>
        {value}%
      </span>
    </div>
  )
}
