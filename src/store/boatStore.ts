import { create } from 'zustand'
import type { ConnectionStatus, TelemetryMessage } from '@/types/protocol'

const DEFAULT_TELEMETRY: TelemetryMessage = {
  protocolVersion: 1,
  type: 'telemetry',
  batteryVoltage: 0,
  batteryPercent: 0,
  heading: 0,
  headingLock: false,
  targetHeading: 0,
  servoAngle: 0,
  sonar: Array(13).fill(0),
  leftMotorTarget: 0,
  rightMotorTarget: 0,
  leftMotorActual: 0,
  rightMotorActual: 0,
  wifiRSSI: 0,
  connected: false,
  calibrating: false,
}

interface BoatState {
  connectionStatus: ConnectionStatus
  lastTelemetryAt: number
  telemetry: TelemetryMessage
  leftMotorCommand: number
  rightMotorCommand: number
  setConnectionStatus: (status: ConnectionStatus) => void
  setTelemetry: (data: TelemetryMessage) => void
  setLeftMotor: (value: number) => void
  setRightMotor: (value: number) => void
  resetMotors: () => void
}

export const useBoatStore = create<BoatState>((set) => ({
  connectionStatus: 'disconnected',
  lastTelemetryAt: 0,
  telemetry: DEFAULT_TELEMETRY,
  leftMotorCommand: 0,
  rightMotorCommand: 0,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setTelemetry: (data) =>
    set({ telemetry: data, lastTelemetryAt: Date.now() }),

  setLeftMotor: (value) =>
    set({ leftMotorCommand: Math.round(Math.max(0, Math.min(100, value))) }),

  setRightMotor: (value) =>
    set({ rightMotorCommand: Math.round(Math.max(0, Math.min(100, value))) }),

  resetMotors: () => set({ leftMotorCommand: 0, rightMotorCommand: 0 }),
}))
