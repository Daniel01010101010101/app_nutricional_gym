import { Dumbbell, Home, Warehouse } from 'lucide-react'
import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'

import { WhyButton } from '@/components/common/WhyButton'
import { ChipGroup, Segmented } from '@/components/form/ChipGroup'
import { ChoiceCards } from '@/components/form/ChoiceCards'
import { Field } from '@/components/form/Field'
import { MultiSelectSearch } from '@/components/form/MultiSelectSearch'
import { WeekdayPicker } from '@/components/form/WeekdayPicker'
import { Textarea } from '@/components/ui/textarea'
import { recommendTrainingDays } from '@/domain/training/days'
import { EQUIPMENT_PRESETS, type EquipmentPreset } from '@/domain/training/selection'
import { MUSCLE_LABEL } from '@/domain/training/volume'
import { TRACKED_MUSCLES, type Equipment, type Joint, type Weekday } from '@/domain/types'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { EQUIPMENT_LABEL, JOINT_LABEL } from '@/lib/labels'

import type { OnboardingValues } from '../model'
import { useStepField } from '../useStepField'

const SESSION_OPTIONS = ['45', '60', '75', '90', '120'] as const
const EQUIPMENT_ORDER: Equipment[] = [
  'barbell',
  'rack',
  'bench',
  'dumbbell',
  'machine',
  'cable',
  'pullup-bar',
  'kettlebell',
  'band',
  'ez-bar',
  'trap-bar',
  'smith',
]

export function TrainingStep() {
  const repos = useRepositories()
  const { data: exercises = [] } = useLive(() => repos.exercises.observeAll(), [])
  const experience = useStepField('experience')
  const weekdays = useStepField('availableWeekdays')
  const days = useStepField('trainingDays')
  const minutes = useStepField('sessionMinutes')
  const preset = useStepField('equipmentPreset')
  const equipment = useStepField('equipment')
  const injuries = useStepField('injuries')
  const injuryNotes = useStepField('injuryNotes')
  const priorities = useStepField('priorityMuscles')
  const excluded = useStepField('excludedExerciseIds')
  const exp = useWatch<OnboardingValues, 'experience'>({ name: 'experience' })

  const recommendation = recommendTrainingDays(weekdays.value.length, exp ?? 'beginner')
  const syncDays = (available: number, level: OnboardingValues['experience']) => {
    days.onChange(recommendTrainingDays(available, level ?? 'beginner').value.recommended)
  }

  const exerciseItems = useMemo(
    () =>
      exercises.map((e) => ({
        id: e.id,
        label: e.name,
        sublabel: `${MUSCLE_LABEL[e.primaryMuscle]} · ${e.nameEn}`,
        keywords: e.aliases.join(' '),
      })),
    [exercises],
  )

  return (
    <div className="space-y-7">
      <Field label="Experiencia entrenando fuerza" error={experience.error}>
        <ChoiceCards
          aria-label="Experiencia"
          value={experience.value}
          onChange={(v) => {
            experience.onChange(v)
            syncDays(weekdays.value.length, v)
          }}
          invalid={Boolean(experience.error)}
          options={[
            {
              value: 'beginner',
              label: 'Principiante',
              description: 'Menos de 1 año entrenando con constancia.',
            },
            { value: 'intermediate', label: 'Intermedio', description: 'Entre 1 y 3 años.' },
            {
              value: 'advanced',
              label: 'Avanzado',
              description: 'Más de 3 años y técnica sólida en los básicos.',
            },
          ]}
        />
      </Field>

      <Field label="¿Qué días puedes entrenar?" error={weekdays.error}>
        <WeekdayPicker
          aria-label="Días disponibles"
          value={weekdays.value}
          onChange={(v: Weekday[]) => {
            weekdays.onChange(v)
            syncDays(v.length, exp)
          }}
        />
      </Field>

      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">
              Te recomendamos {recommendation.value.recommended} días por semana
            </p>
            <p className="text-xs text-muted-foreground">
              Mínimo efectivo 3 · ideal 4 · máximo {recommendation.value.maxAllowed} en déficit
            </p>
          </div>
          <WhyButton explanation={recommendation.explanation} compact />
        </div>
        {recommendation.value.warning && (
          <p className="text-xs text-warning">{recommendation.value.warning}</p>
        )}
        <Field label="Días que vas a entrenar" error={days.error}>
          <Segmented
            aria-label="Días de entrenamiento"
            value={days.value !== undefined ? String(days.value) : undefined}
            onChange={(v) => days.onChange(Number(v))}
            options={Array.from(
              { length: Math.max(1, recommendation.value.maxAllowed) },
              (_, i) => ({
                value: String(i + 1),
                label: String(i + 1),
              }),
            )}
          />
        </Field>
      </div>

      <Field label="Duración por sesión" error={minutes.error}>
        <Segmented
          aria-label="Duración por sesión"
          value={minutes.value !== undefined ? String(minutes.value) : undefined}
          onChange={(v) => minutes.onChange(Number(v))}
          options={SESSION_OPTIONS.map((m) => ({ value: m, label: `${m}′` }))}
        />
      </Field>

      <Field label="¿Dónde entrenas?" error={equipment.error}>
        <ChoiceCards
          aria-label="Equipo disponible"
          value={preset.value === 'custom' ? undefined : preset.value}
          onChange={(v: EquipmentPreset) => {
            preset.onChange(v)
            equipment.onChange([...EQUIPMENT_PRESETS[v]])
          }}
          options={[
            {
              value: 'gym',
              label: 'Gimnasio completo',
              description: 'Barras, máquinas, poleas y mancuernas.',
              icon: Warehouse,
            },
            {
              value: 'dumbbells',
              label: 'Mancuernas y banco',
              description: 'En casa o en un gym pequeño.',
              icon: Dumbbell,
            },
            {
              value: 'home',
              label: 'Casa sin pesas',
              description: 'Peso corporal, bandas y barra de dominadas.',
              icon: Home,
            },
          ]}
        />
        <details className="group">
          <summary className="cursor-pointer py-2 text-sm font-semibold text-primary-text">
            Ajustar equipo exacto
          </summary>
          <ChipGroup
            aria-label="Equipo"
            value={equipment.value.filter((e) => e !== 'bodyweight')}
            onChange={(v: Equipment[]) => {
              equipment.onChange([...v, 'bodyweight'])
              preset.onChange('custom')
            }}
            options={EQUIPMENT_ORDER.map((e) => ({ value: e, label: EQUIPMENT_LABEL[e] }))}
          />
        </details>
      </Field>

      <Field
        label="¿Tienes lesiones o molestias?"
        description="Evitaremos ejercicios que carguen esas articulaciones."
      >
        <ChipGroup
          aria-label="Lesiones"
          value={injuries.value}
          onChange={(v: Joint[]) => injuries.onChange(v)}
          options={(Object.keys(JOINT_LABEL) as Joint[]).map((j) => ({
            value: j,
            label: JOINT_LABEL[j],
          }))}
        />
        {injuries.value.length > 0 && (
          <Textarea
            aria-label="Detalles de la lesión"
            placeholder="Detalles (opcional): qué movimientos te molestan…"
            value={injuryNotes.value}
            onChange={(e) => injuryNotes.onChange(e.target.value)}
            className="mt-2 rounded-xl"
            maxLength={300}
          />
        )}
      </Field>

      <Field
        label="Músculos que quieres priorizar"
        description="Hasta 3: les daremos algo más de volumen semanal."
      >
        <ChipGroup
          aria-label="Músculos prioritarios"
          max={3}
          value={priorities.value}
          onChange={priorities.onChange}
          options={TRACKED_MUSCLES.map((m) => ({ value: m, label: MUSCLE_LABEL[m] }))}
        />
      </Field>

      <Field label="Ejercicios que no quieres hacer">
        <MultiSelectSearch
          title="Ejercicios a evitar"
          description="No aparecerán en tu plan."
          addLabel="Elegir ejercicios"
          emptyLabel="Ninguno"
          items={exerciseItems}
          value={excluded.value}
          onChange={excluded.onChange}
        />
      </Field>
    </div>
  )
}
