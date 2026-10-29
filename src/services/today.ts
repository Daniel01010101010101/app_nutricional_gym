import { CHECKIN } from '@/domain/constants/formulas'
import { targetsForDay } from '@/domain/nutrition/dayTarget'
import { daysInRange, timeToMinutes } from '@/domain/shared/dates'
import type { DayStatus } from '@/domain/today/today'
import type { DayKey } from '@/domain/types'
import type {
  FoodLogEntry,
  MealPlanRecord,
  NutritionTargets,
  TrainingPlan,
  WorkoutSession,
} from '@/data/schemas'

import { targetsAt } from './checkin'
import { isTrainingDayFor } from './nutrition'
import { planDayFor } from './workout'

/** Estado de cada día (proteína cumplida, día de entreno, entrenó) para calcular rachas. */
export function dayStatuses(input: {
  logs: readonly FoodLogEntry[]
  targets: readonly NutritionTargets[]
  plan: TrainingPlan | undefined
  sessions: readonly WorkoutSession[]
  from: DayKey
  today: DayKey
}): DayStatus[] {
  const protein = new Map<DayKey, number>()
  for (const l of input.logs) protein.set(l.date, (protein.get(l.date) ?? 0) + l.protein)
  const trained = new Set(input.sessions.filter((s) => s.status === 'completed').map((s) => s.date))
  return daysInRange(input.from, input.today).flatMap((date) => {
    const t = targetsAt(input.targets, date)
    if (!t) return []
    const target = targetsForDay(t, isTrainingDayFor(input.plan, input.sessions, date)).value
      .protein
    return [
      {
        date,
        proteinMet: (protein.get(date) ?? 0) >= target * CHECKIN.proteinMetFraction,
        isTrainingDay: planDayFor(input.plan, date) !== undefined,
        trained: trained.has(date),
      },
    ]
  })
}

/** Próxima comida del plan que aún no registraste (desde 30 min antes de su hora). */
export function nextPlanMeal(
  plan: MealPlanRecord | undefined,
  logs: readonly FoodLogEntry[],
  nowMinutes: number,
): MealPlanRecord['meals'][number] | undefined {
  if (!plan) return undefined
  const logged = new Set(logs.map((l) => l.mealIndex))
  const pending = plan.meals.filter((m) => !logged.has(m.index))
  return pending.find((m) => timeToMinutes(m.time) >= nowMinutes - 30) ?? pending.at(-1)
}

export function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
