import { useWatch } from 'react-hook-form'

import { Segmented } from '@/components/form/ChipGroup'
import { NumberField } from '@/components/form/NumberField'
import { Switch } from '@/components/ui/switch'
import { epley } from '@/domain/progression/e1rm'
import { fmt } from '@/domain/shared/format'
import { MAIN_LIFTS, type MainLift } from '@/domain/types'
import { MAIN_LIFT_EXERCISE_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'

import type { OnboardingValues } from '../model'
import { useStepField } from '../useStepField'

function LiftCard({ lift }: { lift: MainLift }) {
  const known = useStepField(`baseline.${lift}.known`)
  const weight = useStepField(`baseline.${lift}.weight`)
  const reps = useStepField(`baseline.${lift}.reps`)
  const exerciseId = useStepField(`baseline.${lift}.exerciseId`)
  const unit = useWatch<OnboardingValues, 'unit'>({ name: 'unit' })
  const isPullup = lift === 'pullup'
  const weighted = isPullup && exerciseId.value === 'pull-up'
  const e1rm =
    known.value && weight.value !== undefined && reps.value ? epley(weight.value, reps.value) : null

  return (
    <div
      className={cn('space-y-3 rounded-2xl border bg-card p-4', known.value && 'border-primary/40')}
    >
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={known.id} className="font-semibold">
          {MAIN_LIFT_EXERCISE_LABEL[lift]}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {known.value ? 'Sé mi marca' : 'No lo sé'}
          </span>
          <Switch id={known.id} checked={known.value} onCheckedChange={known.onChange} />
        </div>
      </div>
      {known.value && (
        <>
          {isPullup && (
            <Segmented
              aria-label="Variante"
              size="sm"
              value={exerciseId.value}
              onChange={exerciseId.onChange}
              options={[
                { value: 'pull-up', label: 'Dominadas' },
                { value: 'lat-pulldown', label: 'Jalón al pecho' },
              ]}
            />
          )}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <NumberField
                aria-label={weighted ? 'Lastre' : 'Peso'}
                value={weight.value}
                onChange={weight.onChange}
                unit={unit}
                decimals={2}
                invalid={Boolean(weight.error)}
                placeholder={weighted ? '0' : '60'}
              />
              {weighted && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Lastre añadido (0 si es sin peso).
                </p>
              )}
              {weight.error && <p className="mt-1 text-xs text-destructive">{weight.error}</p>}
            </div>
            <span className="pt-3 text-lg font-semibold text-muted-foreground">×</span>
            <div className="w-28">
              <NumberField
                aria-label="Repeticiones"
                value={reps.value}
                onChange={reps.onChange}
                unit="reps"
                decimals={0}
                invalid={Boolean(reps.error)}
                placeholder="5"
              />
              {reps.error && <p className="mt-1 text-xs text-destructive">{reps.error}</p>}
            </div>
          </div>
          {e1rm !== null && e1rm > 0 && (
            <p className="text-xs text-muted-foreground">
              1RM estimado (Epley):{' '}
              <span className="font-semibold text-foreground">
                {fmt(e1rm, 1)} {unit}
              </span>
              {weighted && ' de lastre + tu peso'}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export function StrengthStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Escribe una serie reciente que hayas hecho cerca del fallo (peso × reps). Con esto
        calculamos tu 1RM estimado y tus pesos iniciales. Si no la sabes, no pasa nada: la primera
        sesión sirve para calibrar.
      </p>
      {MAIN_LIFTS.map((lift) => (
        <LiftCard key={lift} lift={lift} />
      ))}
    </div>
  )
}
