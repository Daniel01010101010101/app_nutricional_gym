import Dexie, { type EntityTable } from 'dexie'

import type { Exercise, Food, WorkoutSet } from '@/domain/types'

import type {
  BodyWeight,
  Checkin,
  DailyLog,
  FavoriteMeal,
  FoodLogEntry,
  MealPlanRecord,
  Measurement,
  NutritionTargets,
  OnboardingDraft,
  Profile,
  ProgressPhoto,
  Settings,
  TrainingPlan,
  WorkoutSession,
} from './schemas'

export interface MetaEntry {
  key: string
  value: string
}

/**
 * Base de datos local (IndexedDB vía Dexie).
 * Los catálogos base de alimentos y ejercicios viven en el código (se actualizan con la app);
 * las tablas `foods` y `exercises` guardan solo los que crea el usuario.
 */
export class ForjaDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  settings!: EntityTable<Settings, 'id'>
  onboardingDraft!: EntityTable<OnboardingDraft, 'id'>
  nutritionTargets!: EntityTable<NutritionTargets, 'id'>
  trainingPlans!: EntityTable<TrainingPlan, 'id'>
  foods!: EntityTable<Food, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  foodLogs!: EntityTable<FoodLogEntry, 'id'>
  favoriteMeals!: EntityTable<FavoriteMeal, 'id'>
  mealPlans!: EntityTable<MealPlanRecord, 'date'>
  dailyLogs!: EntityTable<DailyLog, 'date'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  workoutSets!: EntityTable<WorkoutSet, 'id'>
  bodyWeights!: EntityTable<BodyWeight, 'date'>
  measurements!: EntityTable<Measurement, 'id'>
  progressPhotos!: EntityTable<ProgressPhoto, 'id'>
  checkins!: EntityTable<Checkin, 'id'>
  meta!: EntityTable<MetaEntry, 'key'>

  constructor(name = 'forja') {
    super(name)
    this.version(1).stores({
      profile: 'id',
      settings: 'id',
      onboardingDraft: 'id',
      nutritionTargets: 'id, effectiveFrom, source',
      trainingPlans: 'id, status',
      foods: 'id, category',
      exercises: 'id, primaryMuscle, pattern',
      foodLogs: 'id, date, [date+mealIndex], foodId',
      favoriteMeals: 'id',
      mealPlans: 'date',
      dailyLogs: 'date',
      workoutSessions: 'id, date, status, planDayId',
      workoutSets: 'id, sessionId, exerciseId, date, [exerciseId+performedAt]',
      bodyWeights: 'date',
      measurements: 'id, date',
      progressPhotos: 'id, date, pose',
      checkins: 'id, weekStart, decision',
      meta: 'key',
    })
  }
}

export const TABLE_NAMES = [
  'profile',
  'settings',
  'onboardingDraft',
  'nutritionTargets',
  'trainingPlans',
  'foods',
  'exercises',
  'foodLogs',
  'favoriteMeals',
  'mealPlans',
  'dailyLogs',
  'workoutSessions',
  'workoutSets',
  'bodyWeights',
  'measurements',
  'progressPhotos',
  'checkins',
  'meta',
] as const

export type TableName = (typeof TABLE_NAMES)[number]
