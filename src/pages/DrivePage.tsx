import './DrivePage.css'
import { useBoatStore } from '@/store/boatStore'
import { useBoatControl } from '@/hooks/useBoatControl'
import { MotorSlider } from '@/components/MotorSlider'
import { SonarRadar } from '@/components/SonarRadar'
import { Compass } from '@/components/Compass'
import { HeadingLockPanel } from '@/components/HeadingLockPanel'

// ── Emergency Stop ──────────────────────────────────────────────────────────

function EmergencyStop() {
  const { sendEmergencyStop } = useBoatControl()
  const isConnected = useBoatStore((s) => s.connectionStatus === 'connected')

  return (
    <div className="drive-estop">
      <button
        className="estop-btn"
        onClick={sendEmergencyStop}
        disabled={!isConnected}
        aria-label="Emergency Stop"
      >
        <span className="estop-icon" aria-hidden="true" />
        Emergency Stop
      </button>
    </div>
  )
}

// ── Drive page ──────────────────────────────────────────────────────────────

export default function DrivePage() {
  const { sendMotor } = useBoatControl()
  const leftMotor   = useBoatStore((s) => s.leftMotorCommand)
  const rightMotor  = useBoatStore((s) => s.rightMotorCommand)
  const isConnected = useBoatStore((s) => s.connectionStatus === 'connected')

  return (
    <div className="drive-page">
      <div className="drive-main">
        {/* Left motor slider */}
        <div className="drive-motor-left">
          <MotorSlider
            label="Left"
            value={leftMotor}
            onChange={(v) => sendMotor(v, rightMotor)}
            disabled={!isConnected}
          />
        </div>

        {/* Centre column */}
        <div className="drive-center">
          {/* Sonar radar fills available vertical space */}
          <div className="sonar-panel">
            <SonarRadar />
          </div>

          {/* Compass + heading lock panel */}
          <div className="compass-panel">
            {/* Compass scales with screen height for different phone sizes */}
            <Compass size={Math.min(110, Math.round(window.innerHeight * 0.18))} />
            <HeadingLockPanel />
          </div>
        </div>

        {/* Right motor slider */}
        <div className="drive-motor-right">
          <MotorSlider
            label="Right"
            value={rightMotor}
            onChange={(v) => sendMotor(leftMotor, v)}
            disabled={!isConnected}
          />
        </div>
      </div>

      {/* Emergency Stop — always visible at the bottom */}
      <EmergencyStop />
    </div>
  )
}
