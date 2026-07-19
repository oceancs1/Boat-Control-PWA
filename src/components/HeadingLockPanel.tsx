import { useBoatStore } from '@/store/boatStore'
import { useBoatControl } from '@/hooks/useBoatControl'
import './HeadingLockPanel.css'

// ── Servo position bar ──────────────────────────────────────────────────────
// Servo sweeps -60° to +60°. Maps to 0%–100% on the track.

function ServoBar({ angle, active }: { angle: number; active: boolean }) {
  // Clamp and normalise: -60 → 0%, 0 → 50%, +60 → 100%
  const clamped = Math.max(-60, Math.min(60, angle))
  const pct     = ((clamped + 60) / 120) * 100

  return (
    <div className="hlp__servo">
      <span className="hlp__servo-label">Servo / Rudder</span>
      <div className="hlp__servo-track">
        <div
          className={`hlp__servo-thumb${active ? ' hlp__servo-thumb--active' : ''}`}
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="hlp__servo-value">
        {angle > 0 ? `+${angle}` : angle}°
      </span>
    </div>
  )
}

// ── Heading error display ───────────────────────────────────────────────────
// Shortest angular difference, range -180 to +180

function headingError(current: number, target: number): number {
  let err = ((target - current) % 360 + 360) % 360
  if (err > 180) err -= 360
  return Math.round(err)
}

// ── Main component ──────────────────────────────────────────────────────────

export function HeadingLockPanel() {
  const { sendHeadingLock, sendCaptureHeading } = useBoatControl()

  const heading       = useBoatStore((s) => s.telemetry.heading)
  const targetHeading = useBoatStore((s) => s.telemetry.targetHeading)
  const headingLock   = useBoatStore((s) => s.telemetry.headingLock)
  const servoAngle    = useBoatStore((s) => s.telemetry.servoAngle)
  const isConnected   = useBoatStore((s) => s.connectionStatus === 'connected')

  const error    = headingLock ? headingError(heading, targetHeading) : null
  const isLocked = headingLock

  function errorClass(e: number): string {
    if (Math.abs(e) <= 2) return 'hlp__field-value--error-zero'
    return e > 0 ? 'hlp__field-value--error-pos' : 'hlp__field-value--error-neg'
  }

  return (
    <div className="hlp">
      {/* Lock status badge */}
      <div className={`hlp__badge ${isLocked ? 'hlp__badge--locked' : 'hlp__badge--unlocked'}`}>
        <span className="hlp__badge-dot" />
        {isLocked ? 'Heading Locked' : 'No Lock'}
      </div>

      {/* Heading readouts */}
      <div className="hlp__readings">
        <div className="hlp__field">
          <span className="hlp__field-label">Heading</span>
          <span className="hlp__field-value">{heading}°</span>
        </div>

        {isLocked ? (
          <>
            <div className="hlp__field">
              <span className="hlp__field-label">Target</span>
              <span className="hlp__field-value hlp__field-value--locked">
                {targetHeading}°
              </span>
            </div>
            <div className="hlp__field">
              <span className="hlp__field-label">Error</span>
              <span className={`hlp__field-value ${errorClass(error!)}`}>
                {error! > 0 ? `+${error}` : error}°
              </span>
            </div>
          </>
        ) : (
          <div className="hlp__field">
            <span className="hlp__field-label">Target</span>
            <span className="hlp__field-value" style={{ color: 'var(--text-dim)' }}>
              ---
            </span>
          </div>
        )}
      </div>

      {/* Servo position bar — visible when lock is active */}
      {isLocked && (
        <ServoBar angle={servoAngle} active={isLocked} />
      )}

      {/* Control buttons */}
      <div className="hlp__controls">
        <button
          className={`hlp__btn${isLocked ? ' hlp__btn--on' : ''}`}
          onClick={() => sendHeadingLock(!isLocked)}
          disabled={!isConnected}
        >
          {isLocked ? '🔒 Locked' : 'Lock Off'}
        </button>
        <button
          className="hlp__btn"
          onClick={sendCaptureHeading}
          disabled={!isConnected || isLocked}
          title={isLocked ? 'Disable lock before capturing a new heading' : 'Capture current heading as target'}
        >
          Capture
        </button>
      </div>
    </div>
  )
}
