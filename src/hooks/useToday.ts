import { useEffect, useState } from 'react'

import { toDayKey } from '@/domain/shared/dates'
import type { DayKey } from '@/domain/types'

/** Fecha de hoy ('yyyy-MM-dd'); se actualiza sola al pasar la medianoche o al volver a la app. */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => toDayKey(new Date()))
  useEffect(() => {
    const refresh = () => setToday(toDayKey(new Date()))
    const interval = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}
