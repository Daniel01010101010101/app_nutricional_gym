import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RestTimerState {
  /** Momento (ms) en que termina el descanso; null si no hay temporizador. */
  endsAt: number | null
  durationSec: number
  label: string
  start: (seconds: number, label: string) => void
  add: (seconds: number) => void
  stop: () => void
}

/** Temporizador de descanso basado en la hora de fin: sobrevive a recargas y a la pantalla bloqueada. */
export const useRestTimer = create<RestTimerState>()(
  persist(
    (set, get) => ({
      endsAt: null,
      durationSec: 0,
      label: '',
      start: (seconds, label) =>
        set({ endsAt: Date.now() + seconds * 1000, durationSec: seconds, label }),
      add: (seconds) => {
        const { endsAt, durationSec } = get()
        if (endsAt === null) return
        const next = Math.max(Date.now(), endsAt + seconds * 1000)
        set({ endsAt: next, durationSec: Math.max(0, durationSec + seconds) })
      },
      stop: () => set({ endsAt: null, durationSec: 0, label: '' }),
    }),
    { name: 'forja-rest-timer' },
  ),
)
