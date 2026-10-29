import { HeartPulse } from 'lucide-react'
import { useWatch } from 'react-hook-form'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { evaluateHealth } from '@/domain/safety/health'
import type { HealthAnswers } from '@/domain/types'
import { cn } from '@/lib/utils'

import type { OnboardingValues } from '../model'
import { useStepField } from '../useStepField'

const QUESTIONS: { key: keyof HealthAnswers; label: string; femaleOnly?: boolean }[] = [
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'kidneyDisease', label: 'Enfermedad renal' },
  { key: 'heartDisease', label: 'Enfermedad del corazón' },
  { key: 'hypertension', label: 'Hipertensión' },
  { key: 'otherCondition', label: 'Otra condición médica relevante' },
  { key: 'medications', label: 'Tomo medicamentos de forma regular' },
  { key: 'eatingDisorderHistory', label: 'Historial de trastornos de la conducta alimentaria' },
  { key: 'pregnant', label: 'Estoy en embarazo', femaleOnly: true },
  { key: 'breastfeeding', label: 'Estoy en lactancia', femaleOnly: true },
]

function Question({ name, label }: { name: keyof HealthAnswers; label: string }) {
  const field = useStepField(`health.${name}`)
  return (
    <label
      htmlFor={field.id}
      className={cn(
        'flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3',
        field.value && 'border-warning/60',
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <Switch id={field.id} checked={field.value} onCheckedChange={field.onChange} />
    </label>
  )
}

export function HealthStep() {
  const health = useWatch<OnboardingValues, 'health'>({ name: 'health' })
  const sex = useWatch<OnboardingValues, 'sex'>({ name: 'sex' })
  const evaluation = evaluateHealth(health)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Estas preguntas son para tu seguridad. Tus respuestas se quedan solo en este dispositivo.
      </p>
      <div className="space-y-2">
        {QUESTIONS.filter((q) => !q.femaleOnly || sex === 'female').map((q) => (
          <Question key={q.key} name={q.key} label={q.label} />
        ))}
      </div>

      {evaluation.requiresProfessional && (
        <Alert className="border-warning/50">
          <HeartPulse className="text-warning" />
          <AlertTitle>Te recomendamos consultar a un profesional</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-2">
              {evaluation.warnings.map((w) => (
                <li key={w.id}>
                  <strong>{w.title}:</strong> {w.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
