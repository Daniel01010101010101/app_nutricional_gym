import { useMemo, useSyncExternalStore, type DependencyList } from 'react'

import type { Observable } from '@/data/repositories/types'

export interface LiveResult<T> {
  data: T | undefined
  loading: boolean
  error: unknown
}

interface LiveStore<T> {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => LiveResult<T>
}

function createLiveStore<T>(observable: Observable<T>): LiveStore<T> {
  let state: LiveResult<T> = { data: undefined, loading: true, error: null }
  const listeners = new Set<() => void>()
  let subscription: { unsubscribe(): void } | null = null

  const emit = (next: LiveResult<T>) => {
    state = next
    listeners.forEach((listener) => listener())
  }

  return {
    subscribe(onChange) {
      listeners.add(onChange)
      subscription ??= observable.subscribe({
        next: (data) => emit({ data, loading: false, error: null }),
        error: (error: unknown) => emit({ data: undefined, loading: false, error }),
      })
      return () => {
        listeners.delete(onChange)
        if (listeners.size === 0) {
          subscription?.unsubscribe()
          subscription = null
        }
      }
    },
    getSnapshot: () => state,
  }
}

/**
 * Se suscribe a un flujo reactivo de un repositorio y re-renderiza cuando cambian los datos.
 * `loading` es true hasta recibir el primer valor (útil para mostrar skeletons).
 */
export function useLive<T>(factory: () => Observable<T>, deps: DependencyList): LiveResult<T> {
  // Las dependencias son valores simples (fechas, ids): su forma serializada identifica la consulta.
  const key = JSON.stringify(deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createLiveStore(factory()), [key])
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
