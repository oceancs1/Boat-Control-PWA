import { useState } from 'react'
import './SettingsPage.css'
import { useBoatStore } from '@/store/boatStore'
import { useSettingsStore } from '@/store/settingsStore'
import { boatWS } from '@/services/boatWebSocket'
import { PWA_VERSION, PROTOCOL_VERSION } from '@/config'

// ── Connection card ─────────────────────────────────────────────────────────

function ConnectionCard() {
  const savedHost = useSettingsStore((s) => s.wsHost)
  const savedPort = useSettingsStore((s) => s.wsPort)
  const setWsHost = useSettingsStore((s) => s.setWsHost)
  const setWsPort = useSettingsStore((s) => s.setWsPort)

  const connectionStatus = useBoatStore((s) => s.connectionStatus)

  const [host, setHost] = useState(savedHost)
  const [port, setPort] = useState(String(savedPort))

  const hostDirty = host !== savedHost
  const portDirty = port !== String(savedPort)
  const isDirty   = hostDirty || portDirty

  const portNum = parseInt(port, 10)
  const portValid = !isNaN(portNum) && portNum > 0 && portNum < 65536

  function handleApply() {
    if (!portValid) return
    setWsHost(host)
    setWsPort(portNum)
    boatWS.reconnect()
  }

  function handleReset() {
    setHost(savedHost)
    setPort(String(savedPort))
  }

  return (
    <div className="settings-card">
      <h3 className="settings-card__title">Connection</h3>

      {/* Current status */}
      <div className="settings-conn">
        <span className={`settings-conn-dot ${connectionStatus}`} />
        <span>{connectionStatus.toUpperCase()}</span>
        <span style={{ color: 'var(--text-dim)', marginLeft: 'auto', fontSize: '0.6rem' }}>
          ws://{savedHost}:{savedPort}
        </span>
      </div>

      {/* Host input */}
      <div className="settings-field">
        <label className="settings-field__label" htmlFor="ws-host">
          Arduino IP / Host
        </label>
        <input
          id="ws-host"
          className={`settings-field__input${hostDirty ? ' settings-field__input--dirty' : ''}`}
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="192.168.4.1"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
        />
        <span className="settings-field__hint">
          Default: 192.168.4.1 (Arduino AP)
        </span>
      </div>

      {/* Port input */}
      <div className="settings-field">
        <label className="settings-field__label" htmlFor="ws-port">
          WebSocket Port
        </label>
        <input
          id="ws-port"
          className={`settings-field__input${portDirty ? ' settings-field__input--dirty' : ''}`}
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          min={1}
          max={65535}
        />
        <span className="settings-field__hint">
          Default: 81 (WebSockets library)
        </span>
      </div>

      {isDirty && (
        <div className="settings-unsaved">Unsaved changes</div>
      )}

      <button
        className="settings-btn settings-btn--primary"
        onClick={handleApply}
        disabled={!isDirty || !portValid}
      >
        Apply &amp; Reconnect
      </button>

      {isDirty && (
        <button className="settings-btn settings-btn--ghost" onClick={handleReset}>
          Reset
        </button>
      )}
    </div>
  )
}

// ── About card ──────────────────────────────────────────────────────────────

function AboutCard() {
  // Firmware version is not in the telemetry spec; show N/A until the
  // Arduino firmware is updated to include a version field in telemetry.
  const isConnected = useBoatStore((s) => s.connectionStatus === 'connected')

  return (
    <div className="settings-card">
      <h3 className="settings-card__title">About</h3>

      <div className="settings-row">
        <span className="settings-row__label">PWA Version</span>
        <span className="settings-row__value">{PWA_VERSION}</span>
      </div>

      <div className="settings-row">
        <span className="settings-row__label">Protocol</span>
        <span className="settings-row__value">v{PROTOCOL_VERSION}</span>
      </div>

      <div className="settings-row">
        <span className="settings-row__label">Firmware Version</span>
        <span className={`settings-row__value${!isConnected ? ' settings-row__value--dim' : ''}`}>
          {isConnected ? 'N/A' : '—'}
        </span>
      </div>

      <div className="settings-row">
        <span className="settings-row__label">Board</span>
        <span className="settings-row__value settings-row__value--dim">
          Arduino UNO R4 WiFi
        </span>
      </div>
    </div>
  )
}

// ── Quick actions card ──────────────────────────────────────────────────────

function ActionsCard() {
  const connectionStatus = useBoatStore((s) => s.connectionStatus)

  function handleReconnect() {
    boatWS.reconnect()
  }

  return (
    <div className="settings-card">
      <h3 className="settings-card__title">Actions</h3>

      <button
        className="settings-btn settings-btn--ghost"
        onClick={handleReconnect}
        disabled={connectionStatus === 'connecting'}
      >
        {connectionStatus === 'connecting' ? 'Connecting…' : 'Reconnect Now'}
      </button>

      <button
        className="settings-btn settings-btn--ghost"
        onClick={() => window.location.reload()}
      >
        Reload App
      </button>
    </div>
  )
}

// ── Settings page ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <ConnectionCard />
      <AboutCard />
      <ActionsCard />
    </div>
  )
}
