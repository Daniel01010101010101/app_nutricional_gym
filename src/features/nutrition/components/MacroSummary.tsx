import { ProgressRing } from '@/components/common/ProgressRing'
import { WhyButton } from '@/components/common/WhyButton'
import type { DayTargets } from '@/domain/nutrition/dayTarget'
import type { Explanation } from '@/domain/shared/explanation'
import { fmt } from '@/domain/shared/format'
import type { Nutrients } from '@/domain/types'

interface MacroSummaryProps {
  target: DayTargets
  consumed: Nutrients
  explanation: Explanation
}

const MACROS = [
  { key: 'protein', label: 'Proteína', color: 'text-protein' },
  { key: 'carbs', label: 'Carbos', color: 'text-carbs' },
  { key: 'fat', label: 'Grasa', color: 'text-fat' },
] as const

/** Anillos de calorías y macros: lo comido frente al objetivo del día. */
export function MacroSummary({ target, consumed, explanation }: MacroSummaryProps) {
  const left = Math.round(target.kcal - consumed.kcal)
  return (
    <section className="rounded-2xl border bg-card p-4" aria-label="Resumen del día">
      <div className="flex items-center gap-4">
        <ProgressRing
          value={consumed.kcal}
          max={target.kcal}
          size={128}
          stroke={11}
          colorClass="text-kcal"
          label={`Calorías: ${fmt(consumed.kcal)} de ${fmt(target.kcal)}`}
        >
          <span>
            <span className="block font-display text-3xl leading-none font-bold">
              {fmt(Math.abs(left))}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {left >= 0 ? 'kcal restantes' : 'kcal de más'}
            </span>
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {target.isTrainingDay ? 'Día de entreno' : 'Día de descanso'}
            </p>
            <WhyButton explanation={explanation} compact />
          </div>
          <p className="font-display text-2xl leading-none font-bold">
            <span className="tabular">{fmt(consumed.kcal)}</span>
            <span className="font-sans text-sm font-medium text-muted-foreground">
              {' '}
              / {fmt(target.kcal)} kcal
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Fibra {fmt(consumed.fiber)} / {target.fiber} g
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {MACROS.map((m) => {
          const value = consumed[m.key]
          const goal = target[m.key]
          return (
            <div key={m.key} className="flex flex-col items-center gap-1 text-center">
              <ProgressRing
                value={value}
                max={goal}
                size={64}
                stroke={7}
                colorClass={m.color}
                label={`${m.label}: ${fmt(value)} de ${fmt(goal)} g`}
              >
                <span className="tabular text-sm font-bold">{fmt(value)}</span>
              </ProgressRing>
              <span className="text-xs font-semibold">{m.label}</span>
              <span className="tabular text-[11px] text-muted-foreground">
                {goal - value >= 0 ? `faltan ${fmt(goal - value)} g` : `+${fmt(value - goal)} g`}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
