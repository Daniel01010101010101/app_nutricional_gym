import type { Prescription } from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import {
  TRACKED_MUSCLES,
  type Equipment,
  type Exercise,
  type ExperienceLevel,
  type Joint,
  type MovementPattern,
  type Muscle,
  type Weekday,
} from '../types'
import { assignWeekdays, WEEKDAY_LABEL } from './days'
import { prescriptionFor } from './prescription'
import { selectExercise, type SelectionContext } from './selection'
import { splitForDays, type SlotRole, type SplitId } from './splits'
import {
  estimateSessionMinutes,
  MUSCLE_LABEL,
  volumeTargets,
  weeklyVolume,
  type MuscleVolume,
  type VolumeTarget,
} from './volume'

export interface PlannedExercise extends Prescription {
  exerciseId: string
  role: SlotRole
}

export interface PlannedDay {
  key: string
  name: string
  focus: string
  weekday: Weekday | null
  isLegDay: boolean
  exercises: PlannedExercise[]
}

export interface TrainingPlanDraft {
  splitId: SplitId
  splitName: string
  days: PlannedDay[]
  volume: MuscleVolume
  targets: Record<Muscle, VolumeTarget>
  warnings: string[]
}

export interface TrainingPlanInput {
  experience: ExperienceLevel
  daysPerWeek: number
  availableWeekdays: readonly Weekday[]
  sessionMinutes: number
  equipment: readonly Equipment[]
  injuries: readonly Joint[]
  excludedExerciseIds: readonly string[]
  priorityMuscles: readonly Muscle[]
  exercises: readonly Exercise[]
}

/** Patrones con los que se puede sumar volumen directo a cada músculo. */
export const MUSCLE_PATTERNS: Record<Muscle, MovementPattern[]> = {
  chest: ['chest-fly', 'horizontal-push'],
  back: ['horizontal-pull', 'vertical-pull'],
  shoulders: ['lateral-raise', 'rear-delt', 'vertical-push'],
  biceps: ['elbow-flexion'],
  triceps: ['elbow-extension'],
  quads: ['knee-extension', 'lunge', 'squat'],
  hamstrings: ['knee-flexion', 'hinge'],
  glutes: ['hip-thrust', 'hip-abduction', 'lunge'],
  calves: ['calf-raise'],
  abs: ['core-flexion', 'core-stability'],
  forearms: ['elbow-flexion', 'carry'],
  traps: ['shrug', 'carry'],
}

const LOWER_MUSCLES: readonly Muscle[] = ['quads', 'hamstrings', 'glutes', 'calves']
const MAX_SETS_PER_EXERCISE = 4
const MIN_SETS = 2
const MIN_EXERCISES_PER_DAY = 3

function volumeOf(days: readonly PlannedDay[], byId: ReadonlyMap<string, Exercise>): MuscleVolume {
  return weeklyVolume(
    days.flatMap((d) => d.exercises),
    byId,
  )
}

function minutesOf(day: PlannedDay): number {
  return estimateSessionMinutes(day.exercises)
}

function addVolume(
  muscle: Muscle,
  days: PlannedDay[],
  byId: ReadonlyMap<string, Exercise>,
  input: TrainingPlanInput,
  ctx: SelectionContext,
): boolean {
  // 1) Subir una serie a un accesorio o compuesto existente de ese músculo.
  const candidates = days
    .flatMap((d) => d.exercises)
    .filter(
      (e) =>
        e.role !== 'main' &&
        byId.get(e.exerciseId)?.primaryMuscle === muscle &&
        e.sets < MAX_SETS_PER_EXERCISE,
    )
    .sort((a, b) => a.sets - b.sets)
  const first = candidates[0]
  if (first) {
    first.sets += 1
    return true
  }

  // 2) Agregar un accesorio en el día más corto de la región adecuada.
  const isLower = LOWER_MUSCLES.includes(muscle)
  const regionDays = days.filter(
    (d) => muscle === 'abs' || d.isLegDay === isLower || d.key.startsWith('fb'),
  )
  const pool = regionDays.sort((a, b) => minutesOf(a) - minutesOf(b))
  const weekUsed = new Set(days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))
  for (const day of pool) {
    const sessionUsed = new Set(day.exercises.map((e) => e.exerciseId))
    const exercise = selectExercise(
      { patterns: MUSCLE_PATTERNS[muscle], role: 'accessory', muscle },
      input.exercises,
      ctx,
      sessionUsed,
      weekUsed,
    )
    if (exercise && exercise.primaryMuscle === muscle) {
      day.exercises.push({
        exerciseId: exercise.id,
        role: 'accessory',
        ...prescriptionFor('accessory', exercise.kind, input.experience),
      })
      return true
    }
  }
  return false
}

function removeVolume(
  muscle: Muscle,
  days: PlannedDay[],
  byId: ReadonlyMap<string, Exercise>,
): boolean {
  const all = days.flatMap((d) => d.exercises)
  for (const role of ['accessory', 'secondary'] as const) {
    const target = all
      .filter(
        (e) =>
          e.role === role && byId.get(e.exerciseId)?.primaryMuscle === muscle && e.sets > MIN_SETS,
      )
      .sort((a, b) => b.sets - a.sets)[0]
    if (target) {
      target.sets -= 1
      return true
    }
  }
  return false
}

function balanceVolume(
  days: PlannedDay[],
  byId: ReadonlyMap<string, Exercise>,
  targets: Record<Muscle, VolumeTarget>,
  input: TrainingPlanInput,
  ctx: SelectionContext,
): void {
  const blocked = new Set<Muscle>()
  for (let iter = 0; iter < 80; iter++) {
    const volume = volumeOf(days, byId)
    const low = TRACKED_MUSCLES.filter((m) => !blocked.has(m) && volume[m] < targets[m].min).sort(
      (a, b) => volume[a] - targets[a].min - (volume[b] - targets[b].min),
    )[0]
    if (low) {
      if (!addVolume(low, days, byId, input, ctx)) blocked.add(low)
      continue
    }
    const high = TRACKED_MUSCLES.find((m) => !blocked.has(m) && volume[m] > targets[m].max)
    if (!high) return
    if (!removeVolume(high, days, byId)) blocked.add(high)
  }
}

/** Recorta series y accesorios hasta que la sesión quepa en el tiempo disponible. */
export function fitToDuration(day: PlannedDay, minutes: number): boolean {
  const reducers: (() => boolean)[] = [
    () => {
      const e = [...day.exercises]
        .reverse()
        .find((x) => x.role === 'accessory' && x.sets > MIN_SETS)
      if (!e) return false
      e.sets -= 1
      return true
    },
    () => {
      if (day.exercises.length <= MIN_EXERCISES_PER_DAY) return false
      const index = day.exercises.map((x) => x.role).lastIndexOf('accessory')
      if (index === -1) return false
      day.exercises.splice(index, 1)
      return true
    },
    () => {
      const e = day.exercises.find((x) => x.role === 'secondary' && x.sets > MIN_SETS)
      if (!e) return false
      e.sets -= 1
      return true
    },
    () => {
      const e = day.exercises.find((x) => x.role === 'main' && x.sets > 3)
      if (!e) return false
      e.sets -= 1
      return true
    },
  ]
  while (minutesOf(day) > minutes) {
    if (!reducers.some((reduce) => reduce())) return false
  }
  return true
}

/** Genera el plan de entrenamiento semanal completo a partir del perfil. */
export function generateTrainingPlan(input: TrainingPlanInput): Calculated<TrainingPlanDraft> {
  const byId = new Map(input.exercises.map((e) => [e.id, e]))
  const ctx: SelectionContext = {
    equipment: input.equipment,
    injuries: input.injuries,
    excludedIds: input.excludedExerciseIds,
  }
  const { split, sessions } = splitForDays(input.daysPerWeek)
  const weekdays = assignWeekdays(input.availableWeekdays, sessions.length)
  const warnings: string[] = []
  const weekUsed = new Set<string>()

  const days: PlannedDay[] = sessions.map((session, i) => {
    const sessionUsed = new Set<string>()
    const exercises: PlannedExercise[] = []
    for (const slot of session.slots) {
      const exercise = selectExercise(slot, input.exercises, ctx, sessionUsed, weekUsed)
      if (!exercise) {
        if (slot.role === 'main') {
          warnings.push(
            `${session.name}: no hay un ejercicio de ${slot.patterns[0] as string} compatible con tu equipo o lesiones; se omitió.`,
          )
        }
        continue
      }
      sessionUsed.add(exercise.id)
      weekUsed.add(exercise.id)
      exercises.push({
        exerciseId: exercise.id,
        role: slot.role,
        ...prescriptionFor(slot.role, exercise.kind, input.experience),
      })
    }
    return {
      key: session.key,
      name: session.name,
      focus: session.focus,
      weekday: weekdays[i] ?? null,
      isLegDay: session.isLegDay,
      exercises,
    }
  })

  const targets = volumeTargets(input.experience, input.priorityMuscles)
  balanceVolume(days, byId, targets, input, ctx)

  for (const day of days) {
    if (!fitToDuration(day, input.sessionMinutes)) {
      warnings.push(
        `${day.name} dura más de ${input.sessionMinutes} min incluso con el mínimo de series.`,
      )
    }
  }

  const volume = volumeOf(days, byId)
  const short = TRACKED_MUSCLES.filter((m) => volume[m] < targets[m].min)
  if (short.length > 0) {
    warnings.push(
      `Con tu tiempo y equipo, el volumen de ${short.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')} queda por debajo de lo ideal. Si puedes, alarga las sesiones o suma un día.`,
    )
  }

  const schedule = days
    .map((d) =>
      d.weekday ? `${WEEKDAY_LABEL[d.weekday]}: ${d.name}` : `${d.name}: día libre a elección`,
    )
    .join(' · ')
  const [minVol, maxVol] = [targets.chest.min, targets.chest.max]

  return calculated(
    { splitId: split.id, splitName: split.name, days, volume, targets, warnings },
    {
      title: 'Tu plan de entrenamiento',
      summary: `${split.name}, ${days.length} ${days.length === 1 ? 'día' : 'días'} por semana. ${schedule}.`,
      steps: [
        { label: 'Split', value: split.rationale },
        { label: 'Básicos', value: '3–4 series × 4–6 reps a RIR 1–2 (≈80–87 % de tu 1RM)' },
        { label: 'Accesorios', value: '2–4 series × 8–15 reps a RIR 0–2' },
        {
          label: 'Volumen objetivo',
          value: `${minVol}–${maxVol} series efectivas por músculo y semana`,
        },
      ],
      rationale:
        'En déficit, lo que preserva la fuerza es mantener la intensidad (cargas pesadas en los básicos) con un volumen moderado que puedas recuperar.',
    },
  )
}
