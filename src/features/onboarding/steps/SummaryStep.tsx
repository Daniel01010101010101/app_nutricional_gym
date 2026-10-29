import { AlertTriangle, CalendarDays, Dumbbell, Flame, Footprints } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useWatch } from 'react-hook-form'

import { Disclaimer } from '@/components/common/Disclaimer'
import { StatTile } from '@/components/common/StatTile'
import { WhyButton } from '@/components/common/WhyButton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { WEEKDAY_LABEL } from '@/domain/training/days'
import { fmt, fmtPct } from '@/domain/shared/format'
import type { Exercise } from '@/domain/types'
import { cn } from '@/lib/utils'

import type { OnboardingValues } from '../model'
import { buildPreview } from '../preview'
import { useStepField } from '../useStepField'

function Card({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string
  icon: typeof Flame
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <Icon aria-hidden className="size-5 text-primary" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SummaryStep({
  exercises,
  today,
}: {
  exercises: readonly Exercise[]
  today: string
}) {
  const values = useWatch<OnboardingValues>() as OnboardingValues
  const accept = useStepField('acceptDisclaimer')
  const preview = useMemo(() => buildPreview(values, exercises, today), [values, exercises, today])
  const { nutrition, training, cardio, health, bodyFat, profile } = preview
  const cal = nutrition.calories.value

  return (
    <div className="space-y-4">
      {health.requiresProfessional && (
        <Alert className="border-warning/50">
          <AlertTriangle className="text-warning" />
          <AlertTitle>
            {health.noDeficit
              ? 'Plan en mantenimiento por tu salud'
              : 'Revisa tu plan con un profesional'}
          </AlertTitle>
          <AlertDescription>{health.warnings.map((w) => w.title).join(' · ')}</AlertDescription>
        </Alert>
      )}

      <Card
        title="Tus calorías"
        icon={Flame}
        action={<WhyButton explanation={nutrition.calories.explanation} />}
      >
        <p className="font-display text-6xl leading-none font-bold text-kcal">
          {fmt(cal.kcal)}{' '}
          <span className="font-sans text-lg font-medium text-muted-foreground">kcal/día</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {cal.maintenance
            ? 'Mantenimiento: sin déficit por tus respuestas de salud.'
            : `Déficit de ${fmtPct(cal.deficitPct)} → unos ${fmt(cal.expectedWeeklyLossKg, 2)} kg por semana (${fmtPct(cal.expectedWeeklyLossPct, 2)} de tu peso).`}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Proteína"
            value={nutrition.protein.value}
            unit="g"
            accent="protein"
            why={nutrition.protein.explanation}
          />
          <StatTile
            label="Carbos"
            value={nutrition.carbs.value}
            unit="g"
            accent="carbs"
            why={nutrition.carbs.explanation}
          />
          <StatTile
            label="Grasa"
            value={nutrition.fat.value}
            unit="g"
            accent="fat"
            why={nutrition.fat.explanation}
          />
        </div>
        {nutrition.carbCycle && (
          <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3 text-sm">
            <p>
              Entreno: <strong>{fmt(nutrition.carbCycle.value.trainingDay.kcal)} kcal</strong> ·
              Descanso: <strong>{fmt(nutrition.carbCycle.value.restDay.kcal)} kcal</strong>
            </p>
            <WhyButton explanation={nutrition.carbCycle.explanation} compact />
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="TMB" value={fmt(nutrition.bmr.value)} why={nutrition.bmr.explanation} />
          <StatTile
            label="Gasto"
            value={fmt(nutrition.tdee.value)}
            why={nutrition.tdee.explanation}
          />
          <StatTile
            label="Actividad"
            value={`×${fmt(nutrition.activity.value.factor, 3)}`}
            why={nutrition.activity.explanation}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Agua"
            value={fmt(nutrition.water.value.baseMl / 1000, 1)}
            unit="L"
            accent="water"
            why={nutrition.water.explanation}
          />
          <StatTile
            label="Fibra"
            value={nutrition.fiber.value}
            unit="g"
            why={nutrition.fiber.explanation}
          />
          <StatTile
            label="% grasa"
            value={fmt(profile.bodyFat.pct, 1)}
            unit="%"
            {...(bodyFat ? { why: bodyFat.explanation } : {})}
          />
        </div>
      </Card>

      <Card
        title="Tu entrenamiento"
        icon={Dumbbell}
        action={<WhyButton explanation={training.explanation} />}
      >
        <p className="text-sm">
          <strong>{training.value.splitName}</strong>, {training.value.days.length}{' '}
          {training.value.days.length === 1 ? 'día' : 'días'} por semana.
        </p>
        <ul className="divide-y rounded-xl border">
          {training.value.days.map((day) => (
            <li key={day.key} className="flex items-center gap-3 p-3">
              <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
              <span className="w-24 text-sm font-semibold">
                {day.weekday ? WEEKDAY_LABEL[day.weekday] : 'A elección'}
              </span>
              <span className="flex-1 text-sm">
                {day.name}{' '}
                <span className="text-muted-foreground">· {day.exercises.length} ejercicios</span>
              </span>
            </li>
          ))}
        </ul>
        {training.value.warnings.length > 0 && (
          <ul className="space-y-1 text-xs text-warning">
            {training.value.warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Cardio y pasos"
        icon={Footprints}
        action={<WhyButton explanation={cardio.explanation} />}
      >
        <p className="text-sm">{cardio.explanation.summary}</p>
      </Card>

      <div
        className={cn(
          'space-y-3 rounded-2xl border bg-card p-4',
          accept.error && 'border-destructive',
        )}
      >
        <Disclaimer />
        <label htmlFor={accept.id} className="flex items-center gap-3 text-sm font-medium">
          <Checkbox
            id={accept.id}
            checked={accept.value}
            onCheckedChange={(c) => accept.onChange(c === true)}
            className="size-5"
          />
          Entiendo y quiero empezar
        </label>
        {accept.error && <p className="text-xs text-destructive">{accept.error}</p>}
      </div>
    </div>
  )
}
