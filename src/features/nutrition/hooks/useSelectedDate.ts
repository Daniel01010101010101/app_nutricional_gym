import { useSearchParams } from 'react-router'

import type { DayKey } from '@/domain/types'
import { useToday } from '@/hooks/useToday'

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

/** Fecha seleccionada en la URL (?fecha=yyyy-MM-dd); por defecto, hoy. */
export function useSelectedDate(): [DayKey, (date: DayKey) => void, DayKey] {
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const raw = params.get('fecha')
  const date = raw && DAY_KEY.test(raw) ? raw : today
  const setDate = (next: DayKey) => {
    const copy = new URLSearchParams(params)
    if (next === today) copy.delete('fecha')
    else copy.set('fecha', next)
    setParams(copy, { replace: true })
  }
  return [date, setDate, today]
}
