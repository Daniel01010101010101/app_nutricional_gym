import { estimateBodyFatNavy } from '@/domain/body/navy'
import { evaluateHealth } from '@/domain/safety/health'
import { buildCardioPlan } from '@/domain/training/cardio'
import type { DayKey, Exercise, Weekday } from '@/domain/types'
import { nowIso } from '@/data/defaults'
import { nutritionPlanFor } from '@/services/targets'
import { trainingDraftFor } from '@/services/training'

import { profileFromOnboarding, type OnboardingValues } from './model'

/** Calcula todo el plan (sin guardar nada) para mostrarlo en el resumen. */
export function buildPreview(
  values: OnboardingValues,
  exercises: readonly Exercise[],
  today: DayKey,
) {
  const profile = profileFromOnboarding(values, today, nowIso())
  const nutrition = nutritionPlanFor(profile, { today })
  const training = trainingDraftFor(profile, exercises)
  const legDays = training.value.days
    .filter((d) => d.isLegDay && d.weekday !== null)
    .map((d) => d.weekday as Weekday)
  const cardio = buildCardioPlan({
    avgSteps: profile.avgSteps,
    legDays,
    experience: profile.experience,
  })
  const bodyFat =
    profile.bodyFat.method === 'navy'
      ? estimateBodyFatNavy({
          sex: profile.sex,
          heightCm: profile.heightCm,
          neckCm: values.neckCm as number,
          waistCm: values.waistCm as number,
          ...(values.hipCm !== undefined ? { hipCm: values.hipCm } : {}),
        })
      : null
  return { profile, nutrition, training, cardio, health: evaluateHealth(profile.health), bodyFat }
}

export type PlanPreview = ReturnType<typeof buildPreview>
