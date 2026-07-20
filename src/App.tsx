import { useEffect } from 'react'
import { boatWS } from '@/services/boatWebSocket'
import DrivePage from '@/pages/DrivePage'

export default function App() {
  // Start the WebSocket connection when the app loads,
  // and clean it up if the component is ever unmounted.
  useEffect(() => {
    boatWS.start()
    return () => boatWS.stop()
  }, [])

  return <DrivePage />
}
