import type { ActivityLevel } from '../constants/formulas'
import type { Calculated } from '../shared/explanation'
import type { JobType, Sex } from '../types'
import { chooseActivityLevel, computeBmr, computeTdee } from './energy'
import {
  computeCalorieTarget,
  computeCarbCycle,
  computeFiber,
  computeMacros,
  computeWater,
  type CalorieTarget,
  type CarbCycle,
  type WaterTarget,
} from './targets'

export interface NutritionPlanInput {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  bodyFatPct: number
  /** Si el % de grasa viene de un método fiable se usa Katch-McArdle. */
  bodyFatReliable: boolean
  jobType: JobType
  avgSteps: number
  trainingDaysPerWeek: number
  sessionMinutes: number
  noDeficit: boolean
  carbCycling: boolean
  targetWeeklyRate?: number
}

export interface NutritionPlan {
  bmr: Calculated<number>
  activity: Calculated<ActivityLevel>
  tdee: Calculated<number>
  calories: Calculated<CalorieTarget>
  protein: Calculated<number>
  fat: Calculated<number>
  carbs: Calculated<number>
  fiber: Calculated<number>
  water: Calculated<WaterTarget>
  carbCycle: Calculated<CarbCycle> | null
}

/** Calcula el plan nutricional completo a partir del perfil. */
export function buildNutritionPlan(input: NutritionPlanInput): NutritionPlan {
  const bmr = computeBmr({
    sex: input.sex,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age: input.age,
    ...(input.bodyFatReliable ? { reliableBodyFatPct: input.bodyFatPct } : {}),
  })
  const activity = chooseActivityLevel({
    jobType: input.jobType,
    avgSteps: input.avgSteps,
    trainingDaysPerWeek: input.trainingDaysPerWeek,
  })
  const tdee = computeTdee(bmr.value, activity.value)
  const calories = computeCalorieTarget({
    sex: input.sex,
    weightKg: input.weightKg,
    bodyFatPct: input.bodyFatPct,
    tdee: tdee.value,
    bmr: bmr.value,
    noDeficit: input.noDeficit,
    ...(input.targetWeeklyRate !== undefined ? { targetWeeklyRate: input.targetWeeklyRate } : {}),
  })
  const macros = computeMacros({
    kcal: calories.value.kcal,
    weightKg: input.weightKg,
    bodyFatPct: input.bodyFatPct,
    sex: input.sex,
  })
  const carbCycle = input.carbCycling
    ? computeCarbCycle({
        kcal: calories.value.kcal,
        carbs: macros.carbs.value,
        trainingDaysPerWeek: input.trainingDaysPerWeek,
        bmr: bmr.value,
      })
    : null

  return {
    bmr,
    activity,
    tdee,
    calories,
    protein: macros.protein,
    fat: macros.fat,
    carbs: macros.carbs,
    fiber: computeFiber(calories.value.kcal),
    water: computeWater(input.weightKg, input.sessionMinutes),
    carbCycle,
  }
}
