import { create } from 'zustand'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface BoatState {
  connectionStatus: ConnectionStatus
  heading: number    // degrees 0–359.9
  distance: number   // centimetres

  setConnectionStatus: (s: ConnectionStatus) => void
  setTelemetry: (heading: number, distance: number) => void
}

export const useBoatStore = create<BoatState>((set) => ({
  connectionStatus: 'disconnected',
  heading: 0,
  distance: 0,

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setTelemetry: (heading, distance) => set({ heading, distance }),
}))
