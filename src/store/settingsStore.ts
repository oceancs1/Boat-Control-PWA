import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WS_HOST, WS_PORT } from '@/config'

interface SettingsState {
  wsHost: string
  wsPort: number
  setWsHost: (host: string) => void
  setWsPort: (port: number) => void
  getWsUrl: () => string
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      wsHost: WS_HOST,
      wsPort: WS_PORT,

      setWsHost: (host) => set({ wsHost: host.trim() }),
      setWsPort: (port) => set({ wsPort: port }),

      getWsUrl: () => {
        const { wsHost, wsPort } = get()
        return `ws://${wsHost}:${wsPort}`
      },
    }),
    {
      name: 'boat-settings',   // localStorage key
      partialize: (state: SettingsState) => ({
        wsHost: state.wsHost,
        wsPort: state.wsPort,
      }),
    },
  ),
)
