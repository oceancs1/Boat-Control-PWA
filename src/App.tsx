import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { boatWS } from '@/services/boatWebSocket'
import { useBoatStore } from '@/store/boatStore'
import { BatteryIndicator, WifiIndicator } from '@/components/StatusIndicators'
import DrivePage from '@/pages/DrivePage'
import CalibrationPage from '@/pages/CalibrationPage'
import SettingsPage from '@/pages/SettingsPage'

function StatusBar() {
  const connectionStatus = useBoatStore((s) => s.connectionStatus)

  return (
    <header className="status-bar">
      <span className="status-bar__title">Boat Control</span>
      <div className="status-bar__indicators">
        <BatteryIndicator />
        <WifiIndicator />
        <span className="conn-badge">
          <span className={`conn-dot ${connectionStatus}`} />
          <span>{connectionStatus.toUpperCase()}</span>
        </span>
      </div>
    </header>
  )
}

function AppShell() {
  return (
    <div className="app-shell">
      <StatusBar />
      <nav className="main-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
          Drive
        </NavLink>
        <NavLink to="/calibration" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
          Calibration
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
          Settings
        </NavLink>
      </nav>
      <main className="page-content">
        <Routes>
          <Route path="/"            element={<DrivePage />} />
          <Route path="/calibration" element={<CalibrationPage />} />
          <Route path="/settings"    element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  // Start the WebSocket service once when the app mounts
  useEffect(() => {
    boatWS.start()
    return () => boatWS.stop()
  }, [])

  // Listen for service worker update events
  useEffect(() => {
    const handler = () => setUpdateAvailable(true)
    window.addEventListener('sw-update-available', handler)
    return () => window.removeEventListener('sw-update-available', handler)
  }, [])

  function handleUpdate() {
    window.__swUpdate?.(true)
  }

  return (
    <HashRouter>
      {/* Portrait mode warning — CSS shows/hides this via media query */}
      <div className="portrait-warning">
        <svg viewBox="0 0 24 24">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M9 21h6" />
        </svg>
        <p>Please rotate your device to landscape mode</p>
      </div>

      <AppShell />

      {updateAvailable && (
        <div className="update-banner">
          <span>A new version of Boat Control is available.</span>
          <button onClick={handleUpdate}>Update Now</button>
        </div>
      )}
    </HashRouter>
  )
}
