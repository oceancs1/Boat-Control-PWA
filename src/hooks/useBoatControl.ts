import { useCallback } from 'react'
import { boatWS } from '@/services/boatWebSocket'
import { useBoatStore } from '@/store/boatStore'
import { PROTOCOL_VERSION } from '@/config'

// ── useBoatControl ──────────────────────────────────────────────────────────
//
// Provides typed command functions for all PWA → Arduino messages.
// Components call these instead of touching the WebSocket directly.

export function useBoatControl() {
  const setLeftMotor  = useBoatStore((s) => s.setLeftMotor)
  const setRightMotor = useBoatStore((s) => s.setRightMotor)
  const resetMotors   = useBoatStore((s) => s.resetMotors)

  const sendMotor = useCallback((left: number, right: number) => {
    setLeftMotor(left)
    setRightMotor(right)
    boatWS.send({ protocolVersion: PROTOCOL_VERSION, type: 'motor', left, right })
  }, [setLeftMotor, setRightMotor])

  const sendHeadingLock = useCallback((enabled: boolean) => {
    boatWS.send({ protocolVersion: PROTOCOL_VERSION, type: 'headingLock', enabled })
  }, [])

  const sendCaptureHeading = useCallback(() => {
    boatWS.send({ protocolVersion: PROTOCOL_VERSION, type: 'captureHeading' })
  }, [])

  const sendStartCalibration = useCallback(() => {
    boatWS.send({ protocolVersion: PROTOCOL_VERSION, type: 'startCalibration' })
  }, [])

  const sendSaveCalibration = useCallback(() => {
    boatWS.send({ protocolVersion: PROTOCOL_VERSION, type: 'saveCalibration' })
  }, [])

  const sendCancelCalibration = useCallback(() => {
    boatWS.send({ protocolVersion: PROTOCOL_VERSION, type: 'cancelCalibration' })
  }, [])

  const sendEmergencyStop = useCallback(() => {
    resetMotors()
    boatWS.send({ protocolVersion: PROTOCOL_VERSION, type: 'emergencyStop' })
  }, [resetMotors])

  return {
    sendMotor,
    sendHeadingLock,
    sendCaptureHeading,
    sendStartCalibration,
    sendSaveCalibration,
    sendCancelCalibration,
    sendEmergencyStop,
  }
}
