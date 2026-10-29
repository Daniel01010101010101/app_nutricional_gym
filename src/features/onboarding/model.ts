import { z } from 'zod'

import { estimateBodyFatNavy, MeasurementError } from '@/domain/body/navy'
import { recommendTrainingDays } from '@/domain/training/days'
import { LB_PLATES, type LoadingSettings } from '@/domain/training/loading'
import { EQUIPMENT_PRESETS } from '@/domain/training/selection'
import { NO_HEALTH_ISSUES } from '@/domain/safety/health'
import { currentAge } from '@/domain/shared/dates'
import { fromKg, toKg } from '@/domain/shared/units'
import type { DayKey, MainLift } from '@/domain/types'
import { MAIN_LIFTS } from '@/domain/types'
import {
  allergenSchema,
  bodyFatMethodSchema,
  budgetSchema,
  equipmentPresetSchema,
  equipmentSchema,
  experienceSchema,
  healthSchema,
  jobTypeSchema,
  jointSchema,
  muscleSchema,
  restrictionSchema,
  sexSchema,
  unitSchema,
  weekdaySchema,
  type Profile,
} from '@/data/schemas'
import { DEFAULT_BASELINE_EXERCISE } from '@/services/profile'

/* ───────────────────────────── Valores del formulario ───────────────────────────── */

const liftSchema = z.object({
  known: z.boolean(),
  weight: z.number().min(0).max(1000).optional(),
  reps: z.number().int().min(1).max(30).optional(),
  exerciseId: z.string(),
})

export const onboardingSchema = z.object({
  // Paso 1
  name: z.string().max(60),
  sex: sexSchema.optional(),
  age: z.number().optional(),
  heightCm: z.number().optional(),
  weight: z.number().optional(),
  unit: unitSchema,
  // Paso 2
  knowsBodyFat: z.boolean(),
  bodyFatPct: z.number().optional(),
  bodyFatMethod: bodyFatMethodSchema.optional(),
  neckCm: z.number().optional(),
  waistCm: z.number().optional(),
  hipCm: z.number().optional(),
  chestCm: z.number().optional(),
  armCm: z.number().optional(),
  thighCm: z.number().optional(),
  // Paso 3
  jobType: jobTypeSchema.optional(),
  avgSteps: z.number().optional(),
  // Paso 4
  experience: experienceSchema.optional(),
  availableWeekdays: z.array(weekdaySchema),
  trainingDays: z.number().int().optional(),
  sessionMinutes: z.number().int().optional(),
  equipmentPreset: equipmentPresetSchema,
  equipment: z.array(equipmentSchema),
  injuries: z.array(jointSchema),
  injuryNotes: z.string(),
  priorityMuscles: z.array(muscleSchema),
  excludedExerciseIds: z.array(z.string()),
  // Paso 5
  baseline: z.object({
    squat: liftSchema,
    bench: liftSchema,
    deadlift: liftSchema,
    ohp: liftSchema,
    row: liftSchema,
    pullup: liftSchema,
  }),
  // Paso 6
  mealsPerDay: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  trainingTime: z.string(),
  restrictions: z.array(restrictionSchema),
  allergens: z.array(allergenSchema),
  dislikedFoodIds: z.array(z.string()),
  budget: budgetSchema,
  carbCycling: z.boolean(),
  // Paso 7
  health: healthSchema,
  // Resumen
  acceptDisclaimer: z.boolean(),
})

export type OnboardingValues = z.infer<typeof onboardingSchema>
export type OnboardingField = keyof OnboardingValues

export function defaultOnboardingValues(): OnboardingValues {
  const lift = (id: MainLift) => ({ known: false, exerciseId: DEFAULT_BASELINE_EXERCISE[id] })
  return {
    name: '',
    unit: 'kg',
    knowsBodyFat: false,
    jobType: undefined,
    avgSteps: 6000,
    availableWeekdays: [1, 2, 3, 4, 5],
    trainingDays: 4,
    sessionMinutes: 60,
    equipmentPreset: 'gym',
    equipment: [...EQUIPMENT_PRESETS.gym],
    injuries: [],
    injuryNotes: '',
    priorityMuscles: [],
    excludedExerciseIds: [],
    baseline: {
      squat: lift('squat'),
      bench: lift('bench'),
      deadlift: lift('deadlift'),
      ohp: lift('ohp'),
      row: lift('row'),
      pullup: lift('pullup'),
    },
    mealsPerDay: 4,
    trainingTime: '18:00',
    restrictions: [],
    allergens: [],
    dislikedFoodIds: [],
    budget: 'medium',
    carbCycling: false,
    health: { ...NO_HEALTH_ISSUES },
    acceptDisclaimer: false,
  }
}

/* ───────────────────────────── Validación por paso ───────────────────────────── */

export interface StepIssue {
  path: string
  message: string
}

type Check = (v: OnboardingValues, add: (path: string, message: string) => void) => void

const inRange = (
  add: (path: string, message: string) => void,
  path: string,
  value: number | undefined,
  min: number,
  max: number,
  label: string,
  unit = '',
) => {
  if (value === undefined) add(path, `Escribe ${label}`)
  else if (value < min || value > max) add(path, `Debe estar entre ${min} y ${max}${unit}`)
}

export const weightKg = (v: Pick<OnboardingValues, 'weight' | 'unit'>) =>
  v.weight === undefined ? undefined : toKg(v.weight, v.unit)

const STEP_CHECKS: Check[] = [
  // 1. Datos básicos
  (v, add) => {
    if (v.name.trim().length === 0) add('name', 'Escribe tu nombre')
    if (!v.sex) add('sex', 'Elige una opción')
    if (v.age === undefined) add('age', 'Escribe tu edad')
    else if (v.age < 18) add('age', 'FORJA está pensada para mayores de 18 años')
    else if (v.age > 90 || !Number.isInteger(v.age)) add('age', 'Escribe una edad válida (18–90)')
    inRange(add, 'heightCm', v.heightCm, 120, 230, 'tu altura', ' cm')
    const kg = weightKg(v)
    if (kg === undefined) add('weight', 'Escribe tu peso')
    else if (kg < 35 || kg > 300) add('weight', 'Escribe un peso válido')
  },
  // 2. Composición corporal
  (v, add) => {
    if (v.knowsBodyFat) {
      inRange(add, 'bodyFatPct', v.bodyFatPct, 3, 70, 'tu % de grasa', ' %')
      if (!v.bodyFatMethod) add('bodyFatMethod', 'Elige cómo lo mediste')
    } else {
      inRange(add, 'neckCm', v.neckCm, 20, 70, 'tu cuello', ' cm')
      inRange(add, 'waistCm', v.waistCm, 40, 200, 'tu cintura', ' cm')
      if (v.sex === 'female') inRange(add, 'hipCm', v.hipCm, 50, 200, 'tu cadera', ' cm')
      if (v.sex && v.heightCm && v.neckCm && v.waistCm && (v.sex === 'male' || v.hipCm)) {
        try {
          estimateBodyFatNavy({
            sex: v.sex,
            heightCm: v.heightCm,
            neckCm: v.neckCm,
            waistCm: v.waistCm,
            ...(v.hipCm !== undefined ? { hipCm: v.hipCm } : {}),
          })
        } catch (error) {
          if (error instanceof MeasurementError) add('waistCm', error.message)
          else throw error
        }
      }
    }
    if (v.chestCm !== undefined) inRange(add, 'chestCm', v.chestCm, 50, 200, 'tu pecho', ' cm')
    if (v.armCm !== undefined) inRange(add, 'armCm', v.armCm, 15, 70, 'tu brazo', ' cm')
    if (v.thighCm !== undefined) inRange(add, 'thighCm', v.thighCm, 30, 100, 'tu muslo', ' cm')
  },
  // 3. Actividad
  (v, add) => {
    if (!v.jobType) add('jobType', 'Elige tu tipo de trabajo')
    inRange(add, 'avgSteps', v.avgSteps, 0, 50000, 'tus pasos promedio')
  },
  // 4. Entrenamiento
  (v, add) => {
    if (!v.experience) add('experience', 'Elige tu experiencia')
    if (v.availableWeekdays.length === 0) add('availableWeekdays', 'Elige al menos un día')
    if (v.trainingDays === undefined || v.trainingDays < 1)
      add('trainingDays', 'Elige cuántos días entrenarás')
    else if (v.trainingDays > v.availableWeekdays.length)
      add('trainingDays', 'No puedes entrenar más días de los que tienes disponibles')
    else if (
      v.experience &&
      v.trainingDays > recommendTrainingDays(7, v.experience).value.maxAllowed
    )
      add('trainingDays', 'En déficit recomendamos máximo 5 días (6 solo para avanzados)')
    inRange(add, 'sessionMinutes', v.sessionMinutes, 20, 180, 'la duración', ' min')
    if (v.equipment.length === 0) add('equipment', 'Elige al menos un tipo de equipo')
  },
  // 5. Fuerza
  (v, add) => {
    for (const lift of MAIN_LIFTS) {
      const mark = v.baseline[lift]
      if (!mark.known) continue
      const isPullup = lift === 'pullup' && mark.exerciseId === 'pull-up'
      if (mark.weight === undefined || (!isPullup && mark.weight <= 0))
        add(`baseline.${lift}.weight`, 'Escribe el peso')
      if (mark.reps === undefined) add(`baseline.${lift}.reps`, 'Escribe las reps')
      else if (mark.reps < 1 || mark.reps > 30) add(`baseline.${lift}.reps`, 'Entre 1 y 30 reps')
    }
  },
  // 6. Nutrición
  (v, add) => {
    if (v.trainingTime !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.trainingTime))
      add('trainingTime', 'Hora inválida')
  },
  // 7. Salud
  () => undefined,
  // 8. Resumen
  (v, add) => {
    if (!v.acceptDisclaimer)
      add('acceptDisclaimer', 'Confirma que entiendes el aviso para continuar')
  },
]

export const STEP_COUNT = STEP_CHECKS.length

export function validateStep(step: number, values: OnboardingValues): StepIssue[] {
  const issues: StepIssue[] = []
  STEP_CHECKS[step]?.(values, (path, message) => issues.push({ path, message }))
  return issues
}

/* ───────────────────────────── Conversión a perfil ───────────────────────────── */

export function bodyFatFromValues(v: OnboardingValues): {
  pct: number
  method: Profile['bodyFat']['method']
} {
  if (v.knowsBodyFat && v.bodyFatPct !== undefined && v.bodyFatMethod) {
    return { pct: v.bodyFatPct, method: v.bodyFatMethod }
  }
  const estimate = estimateBodyFatNavy({
    sex: v.sex as 'male' | 'female',
    heightCm: v.heightCm as number,
    neckCm: v.neckCm as number,
    waistCm: v.waistCm as number,
    ...(v.hipCm !== undefined ? { hipCm: v.hipCm } : {}),
  })
  return { pct: estimate.value, method: 'navy' }
}

export function profileFromOnboarding(v: OnboardingValues, today: DayKey, now: string): Profile {
  const strengthBaseline: Profile['strengthBaseline'] = {}
  for (const lift of MAIN_LIFTS) {
    const mark = v.baseline[lift]
    if (mark.known && mark.weight !== undefined && mark.reps !== undefined) {
      strengthBaseline[lift] = {
        weightKg: toKg(mark.weight, v.unit),
        reps: mark.reps,
        exerciseId: mark.exerciseId,
      }
    }
  }
  const restrictions =
    v.restrictions.includes('vegan') && !v.restrictions.includes('vegetarian')
      ? [...v.restrictions, 'vegetarian' as const]
      : v.restrictions

  return {
    id: 'me',
    name: v.name.trim(),
    sex: v.sex as Profile['sex'],
    age: v.age as number,
    ageRecordedOn: today,
    heightCm: v.heightCm as number,
    weightKg: Math.round((weightKg(v) as number) * 10) / 10,
    bodyFat: bodyFatFromValues(v),
    measurements: {
      ...(v.neckCm !== undefined ? { neckCm: v.neckCm } : {}),
      ...(v.waistCm !== undefined ? { waistCm: v.waistCm } : {}),
      ...(v.hipCm !== undefined ? { hipCm: v.hipCm } : {}),
      ...(v.chestCm !== undefined ? { chestCm: v.chestCm } : {}),
      ...(v.armCm !== undefined ? { armCm: v.armCm } : {}),
      ...(v.thighCm !== undefined ? { thighCm: v.thighCm } : {}),
    },
    jobType: v.jobType as Profile['jobType'],
    avgSteps: v.avgSteps as number,
    experience: v.experience as Profile['experience'],
    trainingDays: v.trainingDays as number,
    availableWeekdays: [...v.availableWeekdays].sort((a, b) => a - b),
    sessionMinutes: v.sessionMinutes as number,
    equipmentPreset: v.equipmentPreset,
    equipment: v.equipment.includes('bodyweight') ? v.equipment : [...v.equipment, 'bodyweight'],
    injuries: v.injuries,
    injuryNotes: v.injuryNotes,
    priorityMuscles: v.priorityMuscles,
    excludedExerciseIds: v.excludedExerciseIds,
    strengthBaseline,
    nutrition: {
      mealsPerDay: v.mealsPerDay,
      trainingTime: v.trainingTime === '' ? null : v.trainingTime,
      restrictions,
      allergens: v.allergens,
      dislikedFoodIds: v.dislikedFoodIds,
      budget: v.budget,
      carbCycling: v.carbCycling,
    },
    health: v.health,
    targetWeeklyRatePct: 0.6,
    createdAt: now,
    updatedAt: now,
  }
}

/** Discos por defecto según la unidad elegida: gimnasios con libras usan discos de 45/35/25/10/5/2.5 lb. */
export function loadingForUnit(
  unit: OnboardingValues['unit'],
  base: LoadingSettings,
): LoadingSettings {
  if (unit === 'kg') return base
  return {
    bar: { value: 45, unit: 'lb' },
    plates: { unit: 'lb', values: [...LB_PLATES] },
    dumbbellIncrement: { value: 5, unit: 'lb' },
    machineIncrement: { value: 10, unit: 'lb' },
  }
}

/** Valores del cuestionario a partir del perfil guardado (para editar y recalcular). */
export function valuesFromProfile(
  profile: Profile,
  options: { unit: OnboardingValues['unit']; weightKg: number; today: DayKey },
): OnboardingValues {
  const fromKgValue = (kg: number) => Math.round(fromKg(kg, options.unit) * 10) / 10
  const baseline = defaultOnboardingValues().baseline
  for (const lift of MAIN_LIFTS) {
    const mark = profile.strengthBaseline[lift]
    if (mark)
      baseline[lift] = {
        known: true,
        weight: fromKgValue(mark.weightKg),
        reps: mark.reps,
        exerciseId: mark.exerciseId,
      }
  }
  const known = profile.bodyFat.method !== 'navy'
  return {
    name: profile.name,
    sex: profile.sex,
    age: currentAge(profile.age, profile.ageRecordedOn, options.today),
    heightCm: profile.heightCm,
    weight: fromKgValue(options.weightKg),
    unit: options.unit,
    knowsBodyFat: known,
    ...(known ? { bodyFatPct: profile.bodyFat.pct, bodyFatMethod: profile.bodyFat.method } : {}),
    ...profile.measurements,
    jobType: profile.jobType,
    avgSteps: profile.avgSteps,
    experience: profile.experience,
    availableWeekdays: profile.availableWeekdays,
    trainingDays: profile.trainingDays,
    sessionMinutes: profile.sessionMinutes,
    equipmentPreset: profile.equipmentPreset,
    equipment: profile.equipment,
    injuries: profile.injuries,
    injuryNotes: profile.injuryNotes,
    priorityMuscles: profile.priorityMuscles,
    excludedExerciseIds: profile.excludedExerciseIds,
    baseline,
    mealsPerDay: profile.nutrition.mealsPerDay,
    trainingTime: profile.nutrition.trainingTime ?? '',
    restrictions: profile.nutrition.restrictions,
    allergens: profile.nutrition.allergens,
    dislikedFoodIds: profile.nutrition.dislikedFoodIds,
    budget: profile.nutrition.budget,
    carbCycling: profile.nutrition.carbCycling,
    health: profile.health,
    acceptDisclaimer: true,
  }
}

/** ¿Cambió algo que afecte el plan de entrenamiento? */
export function trainingInputsChanged(before: Profile, after: Profile): boolean {
  const pick = (p: Profile) =>
    JSON.stringify([
      p.experience,
      p.trainingDays,
      p.availableWeekdays,
      p.sessionMinutes,
      p.equipment,
      p.injuries,
      p.priorityMuscles,
      p.excludedExerciseIds,
      p.strengthBaseline,
    ])
  return pick(before) !== pick(after)
}
