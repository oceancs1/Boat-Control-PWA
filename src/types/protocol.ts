// ── Outgoing message types (PWA → Arduino) ─────────────────────────────────

export interface HeartbeatMessage {
  protocolVersion: 1
  type: 'heartbeat'
}

export interface MotorMessage {
  protocolVersion: 1
  type: 'motor'
  left: number   // 0–100
  right: number  // 0–100
}

export interface HeadingLockMessage {
  protocolVersion: 1
  type: 'headingLock'
  enabled: boolean
}

export interface CaptureHeadingMessage {
  protocolVersion: 1
  type: 'captureHeading'
}

export interface StartCalibrationMessage {
  protocolVersion: 1
  type: 'startCalibration'
}

export interface SaveCalibrationMessage {
  protocolVersion: 1
  type: 'saveCalibration'
}

export interface CancelCalibrationMessage {
  protocolVersion: 1
  type: 'cancelCalibration'
}

export interface EmergencyStopMessage {
  protocolVersion: 1
  type: 'emergencyStop'
}

export type OutgoingMessage =
  | HeartbeatMessage
  | MotorMessage
  | HeadingLockMessage
  | CaptureHeadingMessage
  | StartCalibrationMessage
  | SaveCalibrationMessage
  | CancelCalibrationMessage
  | EmergencyStopMessage

// ── Incoming message types (Arduino → PWA) ─────────────────────────────────

export interface TelemetryMessage {
  protocolVersion: 1
  type: 'telemetry'
  batteryVoltage: number
  batteryPercent: number
  heading: number        // 0–359 degrees
  headingLock: boolean
  targetHeading: number  // 0–359 degrees
  servoAngle: number     // -60 to +60 degrees
  sonar: number[]        // 13 readings in cm, left to right sweep
  leftMotorTarget: number
  rightMotorTarget: number
  leftMotorActual: number
  rightMotorActual: number
  wifiRSSI: number       // dBm, typically -30 to -90
  connected: boolean
  calibrating: boolean
}

export type IncomingMessage = TelemetryMessage

// ── Connection state ────────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
