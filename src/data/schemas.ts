import { z } from 'zod'

import type { Exercise, Food, WorkoutSet } from '@/domain/types'

/**
 * Esquemas Zod de todo lo que se guarda en el dispositivo.
 * Sirven para validar los seeds, los respaldos importados y los datos de los formularios.
 */

export const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida')
export const isoSchema = z.string().min(10)

export const sexSchema = z.enum(['male', 'female'])
export const weekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
])
export const unitSchema = z.enum(['kg', 'lb'])
export const experienceSchema = z.enum(['beginner', 'intermediate', 'advanced'])
export const jobTypeSchema = z.enum(['sedentary', 'standing', 'physical'])
export const bodyFatMethodSchema = z.enum([
  'dexa',
  'bodpod',
  'skinfold-pro',
  'bia-pro',
  'bia-home',
  'navy',
  'visual',
])
export const budgetSchema = z.enum(['low', 'medium', 'high'])
export const restrictionSchema = z.enum(['vegetarian', 'vegan', 'lactose-free', 'gluten-free'])
export const allergenSchema = z.enum([
  'peanut',
  'tree-nuts',
  'egg',
  'fish',
  'shellfish',
  'soy',
  'milk',
  'gluten',
])
export const muscleSchema = z.enum([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'forearms',
  'traps',
])
export const equipmentSchema = z.enum([
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
  'bodyweight',
])
export const jointSchema = z.enum([
  'shoulder',
  'elbow',
  'wrist',
  'lower-back',
  'hip',
  'knee',
  'ankle',
  'neck',
])
export const patternSchema = z.enum([
  'squat',
  'hinge',
  'lunge',
  'horizontal-push',
  'vertical-push',
  'horizontal-pull',
  'vertical-pull',
  'chest-fly',
  'lateral-raise',
  'rear-delt',
  'elbow-flexion',
  'elbow-extension',
  'knee-extension',
  'knee-flexion',
  'hip-thrust',
  'hip-abduction',
  'calf-raise',
  'core-flexion',
  'core-stability',
  'shrug',
  'carry',
])
export const mainLiftSchema = z.enum(['squat', 'bench', 'deadlift', 'ohp', 'row', 'pullup'])
export const mealRoleSchema = z.enum(['protein', 'carb', 'fat', 'vegetable', 'fruit'])
export const slotKindSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack'])

export const explanationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  formula: z.string().optional(),
  steps: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  rationale: z.string().optional(),
  reference: z.string().optional(),
})

/* ───────────────────────────── Catálogos ───────────────────────────── */

const nonNegative = z.number().min(0)

export const foodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    'meat',
    'poultry',
    'fish',
    'egg',
    'dairy',
    'legume',
    'grain',
    'tuber',
    'bread',
    'fruit',
    'vegetable',
    'nut-seed',
    'fat',
    'sweet',
    'supplement',
    'beverage',
    'prepared',
    'plant-protein',
  ]),
  per100g: z.object({
    kcal: nonNegative.max(900),
    protein: nonNegative.max(100),
    carbs: nonNegative.max(100),
    fat: nonNegative.max(100),
    fiber: nonNegative.max(100),
  }),
  measures: z.array(z.object({ label: z.string().min(1), grams: z.number().positive() })),
  roles: z.array(mealRoleSchema),
  slots: z.array(slotKindSchema),
  diet: z.object({
    vegetarian: z.boolean(),
    vegan: z.boolean(),
    lactose: z.boolean(),
    gluten: z.boolean(),
  }),
  allergens: z.array(allergenSchema),
  cost: budgetSchema,
  section: z.enum([
    'carnes',
    'pescados',
    'huevos-lacteos',
    'frutas-verduras',
    'granos-cereales',
    'panaderia',
    'despensa',
    'suplementos',
  ]),
  purchase: z.object({ label: z.string(), grams: z.number().positive() }).optional(),
  cooked: z
    .object({ yield: z.number().positive(), buyAs: z.enum(['crudo', 'en seco']) })
    .optional(),
  source: z.string().min(1),
  isCustom: z.boolean().optional(),
}) satisfies z.ZodType<Food>

export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().min(1),
  aliases: z.array(z.string()),
  primaryMuscle: muscleSchema,
  secondaryMuscles: z.array(muscleSchema),
  kind: z.enum(['compound', 'isolation']),
  equipment: z.array(equipmentSchema).min(1),
  loadType: z.enum(['barbell', 'dumbbell', 'stack', 'bodyweight', 'fixed']),
  pattern: patternSchema,
  bodyRegion: z.enum(['upper', 'lower', 'core']),
  mainLift: mainLiftSchema.optional(),
  stresses: z.array(jointSchema),
  instructions: z.array(z.string().min(1)).min(1),
  commonMistakes: z.array(z.string().min(1)).min(1),
  isCustom: z.boolean().optional(),
}) satisfies z.ZodType<Exercise>

/* ───────────────────────────── Perfil y ajustes ───────────────────────────── */

export const healthSchema = z.object({
  diabetes: z.boolean(),
  kidneyDisease: z.boolean(),
  heartDisease: z.boolean(),
  hypertension: z.boolean(),
  otherCondition: z.boolean(),
  pregnant: z.boolean(),
  breastfeeding: z.boolean(),
  eatingDisorderHistory: z.boolean(),
  medications: z.boolean(),
})

export const strengthMarkSchema = z.object({
  weightKg: z.number().min(0).max(600),
  reps: z.number().int().min(1).max(30),
  exerciseId: z.string().min(1),
})

export const measurementsSchema = z.object({
  neckCm: z.number().min(20).max(70).optional(),
  waistCm: z.number().min(40).max(200).optional(),
  hipCm: z.number().min(50).max(200).optional(),
  chestCm: z.number().min(50).max(200).optional(),
  armCm: z.number().min(15).max(70).optional(),
  thighCm: z.number().min(30).max(100).optional(),
})

export const equipmentPresetSchema = z.enum(['gym', 'home', 'dumbbells', 'custom'])

export const profileSchema = z.object({
  id: z.literal('me'),
  name: z.string().trim().min(1).max(60),
  sex: sexSchema,
  age: z.number().int().min(18).max(90),
  ageRecordedOn: dayKeySchema,
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(35).max(300),
  bodyFat: z.object({ pct: z.number().min(3).max(70), method: bodyFatMethodSchema }),
  measurements: measurementsSchema,
  jobType: jobTypeSchema,
  avgSteps: z.number().int().min(0).max(50000),
  experience: experienceSchema,
  trainingDays: z.number().int().min(1).max(6),
  availableWeekdays: z.array(weekdaySchema).min(1),
  sessionMinutes: z.number().int().min(20).max(180),
  equipmentPreset: equipmentPresetSchema,
  equipment: z.array(equipmentSchema).min(1),
  injuries: z.array(jointSchema),
  injuryNotes: z.string().max(300),
  priorityMuscles: z.array(muscleSchema).max(3),
  excludedExerciseIds: z.array(z.string()),
  strengthBaseline: z.partialRecord(mainLiftSchema, strengthMarkSchema),
  nutrition: z.object({
    mealsPerDay: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    trainingTime: timeSchema.nullable(),
    restrictions: z.array(restrictionSchema),
    allergens: z.array(allergenSchema),
    dislikedFoodIds: z.array(z.string()),
    budget: budgetSchema,
    carbCycling: z.boolean(),
  }),
  health: healthSchema,
  targetWeeklyRatePct: z.number().min(0.25).max(1),
  createdAt: isoSchema,
  updatedAt: isoSchema,
})
export type Profile = z.infer<typeof profileSchema>

const weightAmountSchema = z.object({ value: z.number().positive(), unit: unitSchema })

export const settingsSchema = z.object({
  id: z.literal('settings'),
  unit: unitSchema,
  checkinWeekday: weekdaySchema,
  loading: z.object({
    bar: weightAmountSchema,
    plates: z.object({ unit: unitSchema, values: z.array(z.number().positive()) }),
    dumbbellIncrement: weightAmountSchema,
    machineIncrement: weightAmountSchema,
  }),
  restSeconds: z.object({
    main: z.number().int().min(30).max(600),
    secondary: z.number().int().min(30).max(600),
    accessory: z.number().int().min(15).max(600),
  }),
  timerSound: z.boolean(),
  timerVibration: z.boolean(),
  autoStartTimer: z.boolean(),
  deloadEveryWeeks: z.number().int().min(5).max(8),
  createdAt: isoSchema,
  updatedAt: isoSchema,
})
export type Settings = z.infer<typeof settingsSchema>

export const onboardingDraftSchema = z.object({
  id: z.literal('draft'),
  step: z.number().int().min(0),
  values: z.record(z.string(), z.unknown()),
  updatedAt: isoSchema,
})
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>

/* ───────────────────────────── Nutrición ───────────────────────────── */

const dayTargetSchema = z.object({ kcal: z.number(), carbs: z.number() })

export const nutritionTargetsSchema = z.object({
  id: z.string(),
  effectiveFrom: dayKeySchema,
  source: z.enum(['onboarding', 'recalculation', 'checkin', 'manual']),
  kcal: z.number().min(800).max(7000),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0),
  waterMl: z.number().min(0),
  waterTrainingMl: z.number().min(0),
  bmr: z.number().min(0),
  tdee: z.number().min(0),
  trainingDayBonusCarbs: z.number().min(0),
  carbCycle: z.object({ trainingDay: dayTargetSchema, restDay: dayTargetSchema }).nullable(),
  explanations: z.record(z.string(), explanationSchema),
  note: z.string(),
  createdAt: isoSchema,
})
export type NutritionTargets = z.infer<typeof nutritionTargetsSchema>

export const foodLogEntrySchema = z.object({
  id: z.string(),
  date: dayKeySchema,
  mealIndex: z.number().int().min(0).max(5),
  kind: z.enum(['food', 'quick']),
  foodId: z.string().nullable(),
  name: z.string().min(1),
  grams: z.number().positive().nullable(),
  measureLabel: z.string().nullable(),
  quantity: z.number().positive().nullable(),
  kcal: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0),
  createdAt: isoSchema,
  updatedAt: isoSchema,
})
export type FoodLogEntry = z.infer<typeof foodLogEntrySchema>

export const favoriteMealSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  items: z.array(
    z.object({
      foodId: z.string().nullable(),
      name: z.string(),
      grams: z.number().positive().nullable(),
      measureLabel: z.string().nullable(),
      quantity: z.number().positive().nullable(),
      kcal: z.number().min(0),
      protein: z.number().min(0),
      carbs: z.number().min(0),
      fat: z.number().min(0),
      fiber: z.number().min(0),
    }),
  ),
  createdAt: isoSchema,
  updatedAt: isoSchema,
})
export type FavoriteMeal = z.infer<typeof favoriteMealSchema>

const macrosSchema = z.object({
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
})

export const mealPlanSchema = z.object({
  date: dayKeySchema,
  seed: z.number().int(),
  target: macrosSchema,
  meals: z.array(
    z.object({
      index: z.number().int(),
      name: z.string(),
      time: timeSchema,
      kind: slotKindSchema,
      isPreWorkout: z.boolean(),
      isPostWorkout: z.boolean(),
      target: macrosSchema,
      items: z.array(
        z.object({ foodId: z.string(), grams: z.number().positive(), role: mealRoleSchema }),
      ),
    }),
  ),
  generatedAt: isoSchema,
})
export type MealPlanRecord = z.infer<typeof mealPlanSchema>

export const dailyLogSchema = z.object({
  date: dayKeySchema,
  waterMl: z.number().int().min(0).max(15000),
  steps: z.number().int().min(0).max(100000),
  updatedAt: isoSchema,
})
export type DailyLog = z.infer<typeof dailyLogSchema>

/* ───────────────────────────── Entrenamiento ───────────────────────────── */

export const plannedExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  role: z.enum(['main', 'secondary', 'accessory']),
  sets: z.number().int().min(1).max(10),
  repMin: z.number().int().min(1).max(50),
  repMax: z.number().int().min(1).max(50),
  rirMin: z.number().int().min(0).max(5),
  rirMax: z.number().int().min(0).max(5),
  restSec: z.number().int().min(15).max(600),
})
export type PlanExercise = z.infer<typeof plannedExerciseSchema>

export const planDaySchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string().min(1).max(40),
  focus: z.string(),
  weekday: weekdaySchema.nullable(),
  isLegDay: z.boolean(),
  exercises: z.array(plannedExerciseSchema),
})
export type PlanDay = z.infer<typeof planDaySchema>

export const trainingPlanSchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'archived']),
  splitId: z.enum(['full-body', 'upper-lower', 'upper-lower-ppl', 'ppl']),
  splitName: z.string(),
  blockStartDate: dayKeySchema,
  days: z.array(planDaySchema),
  warnings: z.array(z.string()),
  explanation: explanationSchema,
  createdAt: isoSchema,
  updatedAt: isoSchema,
})
export type TrainingPlan = z.infer<typeof trainingPlanSchema>

export const rating = z.number().int().min(1).max(5)

export const workoutSessionSchema = z.object({
  id: z.string(),
  date: dayKeySchema,
  startedAt: isoSchema,
  endedAt: isoSchema.nullable(),
  status: z.enum(['in_progress', 'completed']),
  planId: z.string().nullable(),
  planDayId: z.string().nullable(),
  title: z.string(),
  exerciseIds: z.array(z.string()),
  isDeload: z.boolean(),
  feeling: rating.nullable(),
  energy: rating.nullable(),
  sleep: rating.nullable(),
  notes: z.string(),
  createdAt: isoSchema,
  updatedAt: isoSchema,
})
export type WorkoutSession = z.infer<typeof workoutSessionSchema>

export const workoutSetSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  exerciseId: z.string(),
  exerciseOrder: z.number().int().min(0),
  setIndex: z.number().int().min(0),
  weightKg: z.number().min(0).max(700),
  reps: z.number().int().min(0).max(200),
  rir: z.number().int().min(0).max(4).nullable(),
  isWarmup: z.boolean(),
  notes: z.string().optional(),
  date: dayKeySchema,
  performedAt: isoSchema,
}) satisfies z.ZodType<WorkoutSet>

/* ───────────────────────────── Cuerpo y check-in ───────────────────────────── */

export const bodyWeightSchema = z.object({
  date: dayKeySchema,
  weightKg: z.number().min(30).max(350),
  updatedAt: isoSchema,
})
export type BodyWeight = z.infer<typeof bodyWeightSchema>

export const measurementSchema = measurementsSchema.extend({
  id: z.string(),
  date: dayKeySchema,
  bodyFatPct: z.number().min(2).max(75).optional(),
  createdAt: isoSchema,
})
export type Measurement = z.infer<typeof measurementSchema>

export const photoPoseSchema = z.enum(['front', 'side', 'back'])

export const progressPhotoSchema = z.object({
  id: z.string(),
  date: dayKeySchema,
  pose: photoPoseSchema,
  blob: z.instanceof(Blob),
  thumb: z.instanceof(Blob),
  createdAt: isoSchema,
})
export type ProgressPhoto = z.infer<typeof progressPhotoSchema>

export const checkinSchema = z.object({
  id: z.string(),
  weekStart: dayKeySchema,
  weekEnd: dayKeySchema,
  date: dayKeySchema,
  avgWeightKg: z.number().nullable(),
  weeklyChangePct: z.number().nullable(),
  previousWeeklyChangePct: z.number().nullable(),
  waistCm: z.number().nullable(),
  waistChangeCm: z.number().nullable(),
  nutritionAdherencePct: z.number(),
  trainingAdherencePct: z.number(),
  sleep: rating,
  stress: rating,
  hunger: rating,
  energy: rating,
  recommendation: z.object({
    type: z.string(),
    kcalDelta: z.number(),
    trainingDayCarbsDelta: z.number(),
    actionable: z.boolean(),
    notes: z.array(z.string()),
  }),
  explanation: explanationSchema,
  decision: z.enum(['pending', 'applied', 'ignored']),
  decidedAt: isoSchema.nullable(),
  createdAt: isoSchema,
})
export type Checkin = z.infer<typeof checkinSchema>
