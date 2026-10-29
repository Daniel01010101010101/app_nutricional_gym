import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShoppingState {
  /** Alimentos marcados como comprados, por lista (rango de fechas). */
  checked: Record<string, string[]>
  toggle: (list: string, foodId: string) => void
  reset: (list: string) => void
}

const MAX_LISTS = 6

/** Marcas de la lista de mercado: viven en este teléfono y se guardan entre visitas. */
export const useShopping = create<ShoppingState>()(
  persist(
    (set) => ({
      checked: {},
      toggle: (list, foodId) =>
        set((state) => {
          const current = state.checked[list] ?? []
          const next = current.includes(foodId)
            ? current.filter((id) => id !== foodId)
            : [...current, foodId]
          const keys = Object.keys(state.checked)
            .filter((k) => k !== list)
            .slice(-(MAX_LISTS - 1))
          return {
            checked: {
              ...Object.fromEntries(keys.map((k) => [k, state.checked[k] ?? []])),
              [list]: next,
            },
          }
        }),
      reset: (list) => set((state) => ({ checked: { ...state.checked, [list]: [] } })),
    }),
    { name: 'forja-shopping' },
  ),
)
