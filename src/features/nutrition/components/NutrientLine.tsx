import { fmt } from '@/domain/shared/format'
import type { Nutrients } from '@/domain/types'
import { cn } from '@/lib/utils'

const ITEMS = [
  { key: 'protein', label: 'P', color: 'bg-protein' },
  { key: 'carbs', label: 'C', color: 'bg-carbs' },
  { key: 'fat', label: 'G', color: 'bg-fat' },
] as const

/** kcal y macros de una porción en una línea compacta. */
export function NutrientLine({
  nutrients,
  grams,
  className,
}: {
  nutrients: Nutrients
  grams?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-muted/60 px-3 py-2 text-sm',
        className,
      )}
    >
      <span className="font-semibold">
        <span className="tabular">{fmt(nutrients.kcal)}</span> kcal
      </span>
      {ITEMS.map((i) => (
        <span key={i.key} className="flex items-center gap-1.5">
          <span aria-hidden className={cn('size-2 rounded-full', i.color)} />
          <span className="sr-only">
            {i.key === 'protein' ? 'Proteína' : i.key === 'carbs' ? 'Carbohidratos' : 'Grasa'}
          </span>
          <span aria-hidden className="text-muted-foreground">
            {i.label}
          </span>
          <span className="tabular">{fmt(nutrients[i.key], 1)} g</span>
        </span>
      ))}
      {grams !== undefined && (
        <span className="tabular ml-auto text-xs text-muted-foreground">{fmt(grams)} g</span>
      )}
    </div>
  )
}
