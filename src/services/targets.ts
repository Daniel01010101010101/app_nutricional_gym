import { buildNutritionPlan, type NutritionPlan } from '@/domain/nutrition/plan'
import type { Explanation } from '@/domain/shared/explanation'
import type { DayKey } from '@/domain/types'
import { newId, nowIso } from '@/data/defaults'
import type { NutritionTargets, Profile } from '@/data/schemas'

import { nutritionInputFor } from './profile'

export function explanationsOf(plan: NutritionPlan): Record<string, Explanation> {
  return {
    bmr: plan.bmr.explanation,
    activity: plan.activity.explanation,
    tdee: plan.tdee.explanation,
    kcal: plan.calories.explanation,
    protein: plan.protein.explanation,
    fat: plan.fat.explanation,
    carbs: plan.carbs.explanation,
    fiber: plan.fiber.explanation,
    water: plan.water.explanation,
    ...(plan.carbCycle ? { carbCycle: plan.carbCycle.explanation } : {}),
  }
}

export function nutritionPlanFor(
  profile: Profile,
  options: { today: DayKey; weightKg?: number; bodyFatPct?: number },
) {
  return buildNutritionPlan(nutritionInputFor(profile, options))
}

/** Convierte el plan nutricional calculado en un registro versionado de objetivos. */
export function targetsRecordFrom(
  plan: NutritionPlan,
  options: {
    effectiveFrom: DayKey
    source: NutritionTargets['source']
    note: string
    trainingDayBonusCarbs?: number
  },
): NutritionTargets {
  return {
    id: newId(),
    effectiveFrom: options.effectiveFrom,
    source: options.source,
    kcal: plan.calories.value.kcal,
    protein: plan.protein.value,
    carbs: plan.carbs.value,
    fat: plan.fat.value,
    fiber: plan.fiber.value,
    waterMl: plan.water.value.baseMl,
    waterTrainingMl: plan.water.value.trainingDayMl,
    bmr: plan.bmr.value,
    tdee: plan.tdee.value,
    trainingDayBonusCarbs: options.trainingDayBonusCarbs ?? 0,
    carbCycle: plan.carbCycle?.value ?? null,
    explanations: explanationsOf(plan),
    note: options.note,
    createdAt: nowIso(),
  }
}
