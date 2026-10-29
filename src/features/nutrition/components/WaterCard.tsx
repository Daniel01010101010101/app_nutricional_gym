import { Droplet, Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { fmt } from '@/domain/shared/format'
import type { DayKey } from '@/domain/types'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'

const GLASS_ML = 250

/** Registro de agua por vasos de 250 ml. */
export function WaterCard({ date, targetMl }: { date: DayKey; targetMl: number }) {
  const repos = useRepositories()
  const { data: log } = useLive(() => repos.dailyLogs.observe(date), [date])
  const ml = log?.waterMl ?? 0
  const pct = targetMl > 0 ? Math.min(100, (ml / targetMl) * 100) : 0
  const change = (delta: number) =>
    void repos.dailyLogs.upsert(date, { waterMl: Math.max(0, Math.min(15000, ml + delta)) })

  return (
    <section className="flex items-center gap-3 rounded-2xl border bg-card p-4" aria-label="Agua">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-water/15 text-water">
        <Droplet aria-hidden className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          Agua <span className="tabular">{fmt(ml / 1000, 2)}</span>
          <span className="font-normal text-muted-foreground"> / {fmt(targetMl / 1000, 1)} L</span>
        </p>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Agua del día"
          aria-valuemin={0}
          aria-valuemax={targetMl}
          aria-valuenow={ml}
        >
          <div
            className="h-full rounded-full bg-water transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Quitar un vaso"
        disabled={ml === 0}
        onClick={() => change(-GLASS_ML)}
      >
        <Minus />
      </Button>
      <Button size="icon" aria-label="Sumar un vaso de 250 ml" onClick={() => change(GLASS_ML)}>
        <Plus />
      </Button>
    </section>
  )
}
