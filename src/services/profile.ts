import { isReliableBodyFatMethod } from '@/domain/body/composition'
import type { FoodPreferences } from '@/domain/nutrition/foods'
import type { NutritionPlanInput } from '@/domain/nutrition/plan'
import { evaluateHealth } from '@/domain/safety/health'
import { currentAge } from '@/domain/shared/dates'
import type { DayKey, MainLift } from '@/domain/types'
import type { Profile } from '@/data/schemas'

export function profileAge(profile: Profile, today: DayKey): number {
  return currentAge(profile.age, profile.ageRecordedOn, today)
}

export function healthOf(profile: Profile) {
  return evaluateHealth(profile.health)
}

export function nutritionInputFor(
  profile: Profile,
  options: { today: DayKey; weightKg?: number; bodyFatPct?: number },
): NutritionPlanInput {
  return {
    sex: profile.sex,
    age: profileAge(profile, options.today),
    heightCm: profile.heightCm,
    weightKg: options.weightKg ?? profile.weightKg,
    bodyFatPct: options.bodyFatPct ?? profile.bodyFat.pct,
    bodyFatReliable:
      options.bodyFatPct === undefined && isReliableBodyFatMethod(profile.bodyFat.method),
    jobType: profile.jobType,
    avgSteps: profile.avgSteps,
    trainingDaysPerWeek: profile.trainingDays,
    sessionMinutes: profile.sessionMinutes,
    noDeficit: healthOf(profile).noDeficit,
    carbCycling: profile.nutrition.carbCycling,
    targetWeeklyRate: profile.targetWeeklyRatePct / 100,
  }
}

export function foodPreferencesOf(profile: Profile): FoodPreferences {
  return {
    restrictions: profile.nutrition.restrictions,
    allergens: profile.nutrition.allergens,
    dislikedFoodIds: profile.nutrition.dislikedFoodIds,
    budget: profile.nutrition.budget,
  }
}

/** Ejercicio con el que se hizo el test inicial de cada básico. */
export const DEFAULT_BASELINE_EXERCISE: Record<MainLift, string> = {
  squat: 'back-squat',
  bench: 'bench-press',
  deadlift: 'deadlift',
  ohp: 'overhead-press',
  row: 'barbell-row',
  pullup: 'pull-up',
}
