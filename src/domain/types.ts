/**
 * Tipos compartidos del dominio de FORJA.
 * Convenciones: pesos siempre en kg, alturas y perímetros en cm, días como 'yyyy-MM-dd'.
 */

export type Sex = 'male' | 'female'

/** Día en formato ISO local 'yyyy-MM-dd'. */
export type DayKey = string

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7]

export type WeightUnit = 'kg' | 'lb'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export type JobType = 'sedentary' | 'standing' | 'physical'

export type BodyFatMethod =
  'dexa' | 'bodpod' | 'skinfold-pro' | 'bia-pro' | 'bia-home' | 'navy' | 'visual'

export type BodyFatCategory = 'lean' | 'moderate' | 'high'

export type Budget = 'low' | 'medium' | 'high'

export type DietRestriction = 'vegetarian' | 'vegan' | 'lactose-free' | 'gluten-free'

export type Allergen =
  'peanut' | 'tree-nuts' | 'egg' | 'fish' | 'shellfish' | 'soy' | 'milk' | 'gluten'

export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'forearms'
  | 'traps'

/** Grupos con objetivo de volumen semanal. Antebrazos y trapecio se entrenan de forma indirecta. */
export const TRACKED_MUSCLES: readonly Muscle[] = [
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
]

export type Equipment =
  | 'barbell'
  | 'rack'
  | 'bench'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'pullup-bar'
  | 'kettlebell'
  | 'band'
  | 'ez-bar'
  | 'trap-bar'
  | 'smith'
  | 'bodyweight'

/** Cómo se carga el peso del ejercicio: decide el redondeo a lo que realmente puedes cargar. */
export type LoadType = 'barbell' | 'dumbbell' | 'stack' | 'bodyweight' | 'fixed'

export type Joint =
  'shoulder' | 'elbow' | 'wrist' | 'lower-back' | 'hip' | 'knee' | 'ankle' | 'neck'

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'horizontal-push'
  | 'vertical-push'
  | 'horizontal-pull'
  | 'vertical-pull'
  | 'chest-fly'
  | 'lateral-raise'
  | 'rear-delt'
  | 'elbow-flexion'
  | 'elbow-extension'
  | 'knee-extension'
  | 'knee-flexion'
  | 'hip-thrust'
  | 'hip-abduction'
  | 'calf-raise'
  | 'core-flexion'
  | 'core-stability'
  | 'shrug'
  | 'carry'

export type MainLift = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'row' | 'pullup'

export const MAIN_LIFTS: readonly MainLift[] = [
  'squat',
  'bench',
  'deadlift',
  'ohp',
  'row',
  'pullup',
]

export type BodyRegion = 'upper' | 'lower' | 'core'

export type ExerciseKind = 'compound' | 'isolation'

export interface Exercise {
  id: string
  name: string
  nameEn: string
  aliases: string[]
  primaryMuscle: Muscle
  secondaryMuscles: Muscle[]
  kind: ExerciseKind
  /** Todo el equipo necesario para hacerlo. */
  equipment: Equipment[]
  loadType: LoadType
  pattern: MovementPattern
  bodyRegion: BodyRegion
  mainLift?: MainLift
  /** Articulaciones que conviene proteger: se evita si reportas lesión ahí. */
  stresses: Joint[]
  instructions: string[]
  commonMistakes: string[]
  isCustom?: boolean
}

export type FoodCategory =
  | 'meat'
  | 'poultry'
  | 'fish'
  | 'egg'
  | 'dairy'
  | 'legume'
  | 'grain'
  | 'tuber'
  | 'bread'
  | 'fruit'
  | 'vegetable'
  | 'nut-seed'
  | 'fat'
  | 'sweet'
  | 'supplement'
  | 'beverage'
  | 'prepared'
  | 'plant-protein'

/** Rol del alimento en el generador de comidas. */
export type MealRole = 'protein' | 'carb' | 'fat' | 'vegetable' | 'fruit'

export type ShoppingSection =
  | 'carnes'
  | 'pescados'
  | 'huevos-lacteos'
  | 'frutas-verduras'
  | 'granos-cereales'
  | 'panaderia'
  | 'despensa'
  | 'suplementos'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Nutrients extends Macros {
  fiber: number
}

export interface HouseholdMeasure {
  label: string
  grams: number
}

export interface Food {
  id: string
  name: string
  category: FoodCategory
  /** Valores por 100 g de porción comestible. */
  per100g: Nutrients
  measures: HouseholdMeasure[]
  roles: MealRole[]
  /** Momentos del día en que el generador puede usarlo. */
  slots: MealSlotKind[]
  diet: { vegetarian: boolean; vegan: boolean; lactose: boolean; gluten: boolean }
  allergens: Allergen[]
  cost: Budget
  section: ShoppingSection
  /** Unidad de compra para la lista de mercado (p. ej. huevo = 1 unidad de 50 g). */
  purchase?: { label: string; grams: number }
  source: string
  isCustom?: boolean
}

export type MealSlotKind = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface StrengthMark {
  weightKg: number
  reps: number
}

export type StrengthBaseline = Partial<Record<MainLift, StrengthMark>>

export interface HealthAnswers {
  diabetes: boolean
  kidneyDisease: boolean
  heartDisease: boolean
  hypertension: boolean
  otherCondition: boolean
  pregnant: boolean
  breastfeeding: boolean
  eatingDisorderHistory: boolean
  medications: boolean
}

export interface WorkoutSet {
  id: string
  sessionId: string
  exerciseId: string
  /** Orden del ejercicio dentro de la sesión. */
  exerciseOrder: number
  setIndex: number
  weightKg: number
  reps: number
  /** Repeticiones en reserva (0–4). null si no se registró. */
  rir: number | null
  isWarmup: boolean
  notes?: string
  date: DayKey
  performedAt: string
}
