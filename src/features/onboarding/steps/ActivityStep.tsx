import { Armchair, Footprints, HardHat } from 'lucide-react'

import { ChoiceCards } from '@/components/form/ChoiceCards'
import { Field } from '@/components/form/Field'
import { NumberField } from '@/components/form/NumberField'
import { Button } from '@/components/ui/button'
import { fmt } from '@/domain/shared/format'

import { useStepField } from '../useStepField'

const STEP_PRESETS = [3000, 5000, 7500, 10000, 12500]

export function ActivityStep() {
  const job = useStepField('jobType')
  const steps = useStepField('avgSteps')

  return (
    <div className="space-y-6">
      <Field label="¿Cómo es tu trabajo o actividad principal?" error={job.error}>
        <ChoiceCards
          aria-label="Tipo de trabajo"
          value={job.value}
          onChange={job.onChange}
          invalid={Boolean(job.error)}
          options={[
            {
              value: 'sedentary',
              label: 'Sentado la mayor parte del día',
              description: 'Oficina, estudio, conducción.',
              icon: Armchair,
            },
            {
              value: 'standing',
              label: 'De pie o en movimiento',
              description: 'Comercio, docencia, mesero, enfermería.',
              icon: Footprints,
            },
            {
              value: 'physical',
              label: 'Trabajo físico pesado',
              description: 'Construcción, carga, campo.',
              icon: HardHat,
            },
          ]}
        />
      </Field>

      <Field
        label="Pasos diarios promedio"
        htmlFor={steps.id}
        error={steps.error}
        description="Míralo en la app de salud de tu celular (promedio de la última semana). Si no sabes, elige una aproximación."
      >
        <NumberField
          id={steps.id}
          value={steps.value}
          onChange={steps.onChange}
          unit="pasos"
          decimals={0}
          step={500}
          min={0}
          steppers
          invalid={Boolean(steps.error)}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {STEP_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="xs"
              variant={steps.value === preset ? 'default' : 'secondary'}
              onClick={() => steps.onChange(preset)}
            >
              {fmt(preset)}
            </Button>
          ))}
        </div>
      </Field>
    </div>
  )
}
