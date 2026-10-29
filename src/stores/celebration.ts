import { create } from 'zustand'

export interface Celebration {
  id: string
  title: string
  detail: string
}

interface CelebrationState {
  queue: Celebration[]
  celebrate: (items: Omit<Celebration, 'id'>[]) => void
  dismiss: () => void
}

export const useCelebration = create<CelebrationState>()((set) => ({
  queue: [],
  celebrate: (items) =>
    set((state) => ({
      queue: [...state.queue, ...items.map((item, i) => ({ ...item, id: `${Date.now()}-${i}` }))],
    })),
  dismiss: () => set((state) => ({ queue: state.queue.slice(1) })),
}))
