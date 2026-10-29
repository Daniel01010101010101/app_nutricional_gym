import { CircleHelp } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import type { Explanation } from '@/domain/shared/explanation'
import { cn } from '@/lib/utils'

import { ExplanationDrawer } from './WhyButton'

interface StatTileProps {
  label: string
  value: ReactNode
  unit?: ReactNode
  hint?: ReactNode
  /** Si se pasa, toda la tarjeta abre el "¿Por qué?" del número. */
  why?: Explanation
  accent?: 'kcal' | 'protein' | 'carbs' | 'fat' | 'water' | 'primary'
  className?: string
}

const ACCENT: Record<NonNullable<StatTileProps['accent']>, string> = {
  kcal: 'bg-kcal',
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
  water: 'bg-water',
  primary: 'bg-primary',
}

export function StatTile({ label, value, unit, hint, why, accent, className }: StatTileProps) {
  const [open, setOpen] = useState(false)
  const content = (
    <>
      {accent && (
        <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', ACCENT[accent])} />
      )}
      <span className="flex items-center gap-1 text-[11px] leading-tight font-semibold tracking-wide text-muted-foreground uppercase">
        <span className="min-w-0 truncate">{label}</span>
        {why && <CircleHelp aria-hidden className="size-3.5 shrink-0 text-primary-text" />}
      </span>
      <span className="tabular mt-1 block truncate font-display text-[1.75rem] leading-none font-bold">
        {value}
        {unit && (
          <span className="ml-1 font-sans text-xs font-medium text-muted-foreground">{unit}</span>
        )}
      </span>
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
    </>
  )
  const base = cn(
    'relative block w-full overflow-hidden rounded-2xl border bg-card p-3 text-left',
    className,
  )

  if (!why) return <div className={base}>{content}</div>
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}: ¿por qué?`}
        className={cn(
          base,
          'transition-colors outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50',
        )}
      >
        {content}
      </button>
      <ExplanationDrawer explanation={why} open={open} onOpenChange={setOpen} />
    </>
  )
}
