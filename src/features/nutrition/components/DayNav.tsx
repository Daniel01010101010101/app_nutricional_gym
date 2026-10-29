import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { addDaysToKey } from '@/domain/shared/dates'
import type { DayKey } from '@/domain/types'
import { capitalize, formatDay, relativeDayLabel } from '@/lib/format'

interface DayNavProps {
  date: DayKey
  today: DayKey
  onChange: (date: DayKey) => void
  /** Días hacia adelante permitidos (el diario no deja ir al futuro; el plan sí). */
  maxAhead?: number
}

export function DayNav({ date, today, onChange, maxAhead = 0 }: DayNavProps) {
  const label = relativeDayLabel(date, today)
  const canNext = date < addDaysToKey(today, maxAhead)
  return (
    <div className="flex items-center gap-1 rounded-2xl border bg-card p-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Día anterior"
        onClick={() => onChange(addDaysToKey(date, -1))}
      >
        <ChevronLeft />
      </Button>
      <button
        type="button"
        className="flex-1 rounded-xl py-1.5 text-center"
        onClick={() => onChange(today)}
        aria-label={date === today ? 'Hoy' : `${label}. Volver a hoy`}
      >
        <span className="block font-semibold">{label}</span>
        {['Hoy', 'Ayer', 'Mañana'].includes(label) && (
          <span className="block text-xs text-muted-foreground">
            {capitalize(formatDay(date, "EEEE d 'de' MMMM"))}
          </span>
        )}
      </button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Día siguiente"
        disabled={!canNext}
        onClick={() => onChange(addDaysToKey(date, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
