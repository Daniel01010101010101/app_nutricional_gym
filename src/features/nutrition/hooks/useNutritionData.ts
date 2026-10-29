import { useMemo } from 'react'

import type { DayKey } from '@/domain/types'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { isTrainingDayFor, mealSlotsFor, plannerFoods } from '@/services/nutrition'

/** Datos de nutrición de una fecha: objetivos, comidas registradas, plan del día y catálogo. */
export function useNutritionData(date: DayKey) {
  const repos = useRepositories()
  const profile = useLive(() => repos.profile.observe(), [])
  const targets = useLive(() => repos.targets.observeFor(date), [date])
  const plan = useLive(() => repos.plans.observeActive(), [])
  const sessions = useLive(() => repos.workouts.observeSessions(), [])
  const foods = useLive(() => repos.foods.observeAll(), [])
  const entries = useLive(() => repos.foodLogs.observeByDate(date), [date])
  const mealPlan = useLive(() => repos.mealPlans.observe(date), [date])
  const dailyLog = useLive(() => repos.dailyLogs.observe(date), [date])

  const foodList = foods.data
  const foodsById = useMemo(() => new Map((foodList ?? []).map((f) => [f.id, f])), [foodList])
  const isTrainingDay = isTrainingDayFor(plan.data, sessions.data ?? [], date)
  const p = profile.data
  const allowedFoods = useMemo(
    () => (p && foodList ? plannerFoods(foodList, p) : []),
    [p, foodList],
  )
  const slots = p ? mealSlotsFor(p, isTrainingDay) : []

  return {
    repos,
    loading:
      profile.loading ||
      targets.loading ||
      plan.loading ||
      sessions.loading ||
      foods.loading ||
      entries.loading ||
      mealPlan.loading,
    profile: p,
    targets: targets.data,
    trainingPlan: plan.data,
    sessions: sessions.data ?? [],
    foods: foodList ?? [],
    foodsById,
    allowedFoods,
    entries: entries.data ?? [],
    mealPlan: mealPlan.data,
    dailyLog: dailyLog.data,
    isTrainingDay,
    slots,
  }
}
