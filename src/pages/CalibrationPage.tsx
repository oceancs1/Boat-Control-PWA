import './CalibrationPage.css'
import { useBoatStore } from '@/store/boatStore'
import { useBoatControl } from '@/hooks/useBoatControl'

// ── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, text: 'Place the boat in open water, away from motors and metal objects.' },
  { n: 2, text: 'Press Start Calibration on the Arduino.' },
  { n: 3, text: 'Slowly rotate the boat through at least one full 360° turn.' },
  { n: 4, text: 'Press Save when the heading display looks stable.' },
]

// ── Calibration ring ────────────────────────────────────────────────────────

function CalRing({ heading, calibrating }: { heading: number; calibrating: boolean }) {
  return (
    <div className={`cal-ring-wrap`}>
      <div className="cal-ring-bg" />
      {calibrating && (
        <div className={`cal-ring-spinner${calibrating ? ' cal-ring-spinner--fast' : ''}`} />
      )}
      <div className="cal-ring-inner">
        <span className="cal-ring-heading">{heading}°</span>
        <span className="cal-ring-label">{calibrating ? 'Rotating' : 'Heading'}</span>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function CalibrationPage() {
  const { sendStartCalibration, sendSaveCalibration, sendCancelCalibration } = useBoatControl()

  const isConnected  = useBoatStore((s) => s.connectionStatus === 'connected')
  const calibrating  = useBoatStore((s) => s.telemetry.calibrating)
  const heading      = useBoatStore((s) => s.telemetry.heading)

  // Derive active step index for instruction highlighting
  const activeStep = calibrating ? 3 : 1  // step 3 = rotate, step 1 = ready to start

  function statusText(): string {
    if (!isConnected)  return 'Connect to the boat to begin calibration'
    if (calibrating)   return 'Rotate boat slowly through 360° ...'
    return 'Ready — press Start Calibration'
  }

  function statusClass(): string {
    if (!isConnected)  return 'cal-status--error'
    if (calibrating)   return 'cal-status--active'
    return ''
  }

  return (
    <div className="cal-page">

      {/* ── Left: instructions ── */}
      <div className="cal-instructions">
        <h2 className="cal-title">Compass Calibration</h2>

        <ol className="cal-steps">
          {STEPS.map(({ n, text }) => {
            const isDone   = calibrating && n < activeStep
            const isActive = calibrating && n === activeStep
            return (
              <li
                key={n}
                className={`cal-step${isActive ? ' cal-step--active' : ''}${isDone ? ' cal-step--done' : ''}`}
              >
                <span className="cal-step__num">
                  {isDone ? '✓' : n}
                </span>
                <span>{text}</span>
              </li>
            )
          })}
        </ol>

        <p className="cal-warning">
          Hard-iron calibration only. Keep motors off during calibration for best results.
          Offsets are saved to EEPROM and survive power cycles.
        </p>
      </div>

      {/* ── Centre: live ring ── */}
      <div className="cal-display">
        <CalRing heading={heading} calibrating={calibrating} />
        <p className={`cal-status ${statusClass()}`}>
          {statusText()}
        </p>
      </div>

      {/* ── Right: controls ── */}
      <div className="cal-controls">
        {!isConnected && (
          <div className="cal-disconnected">
            Not connected to boat
          </div>
        )}

        {!calibrating ? (
          <button
            className="cal-btn cal-btn--start"
            onClick={sendStartCalibration}
            disabled={!isConnected}
          >
            Start Calibration
          </button>
        ) : (
          <>
            <button
              className="cal-btn cal-btn--save"
              onClick={sendSaveCalibration}
              disabled={!isConnected}
            >
              Save &amp; Apply
            </button>
            <div className="cal-divider" />
            <button
              className="cal-btn cal-btn--cancel"
              onClick={sendCancelCalibration}
              disabled={!isConnected}
            >
              Cancel
            </button>
          </>
        )}
      </div>

    </div>
  )
}
