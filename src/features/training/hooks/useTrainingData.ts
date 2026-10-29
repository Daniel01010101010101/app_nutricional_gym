import { useMemo } from 'react'

import { trendWeight } from '@/domain/body/weightTrend'
import { useLive } from '@/hooks/useLive'
import { useRepositories } from '@/hooks/useRepositories'
import { useToday } from '@/hooks/useToday'
import { historyByExercise } from '@/services/workout'

/** Datos que comparten las pantallas de entrenamiento. */
export function useTrainingData() {
  const repos = useRepositories()
  const today = useToday()
  const profile = useLive(() => repos.profile.observe(), [])
  const settings = useLive(() => repos.settings.observe(), [])
  const plan = useLive(() => repos.plans.observeActive(), [])
  const exercises = useLive(() => repos.exercises.observeAll(), [])
  const completedSets = useLive(() => repos.workouts.observeCompletedSets(), [])
  const sessions = useLive(() => repos.workouts.observeSessions(), [])
  const active = useLive(() => repos.workouts.observeActive(), [])
  const weights = useLive(() => repos.body.observeWeights(), [])

  const exercisesById = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, e])),
    [exercises.data],
  )
  const history = useMemo(() => historyByExercise(completedSets.data ?? []), [completedSets.data])
  const bodyweightKg = trendWeight(weights.data ?? [], today) ?? profile.data?.weightKg ?? 70

  const loading =
    profile.loading ||
    settings.loading ||
    plan.loading ||
    exercises.loading ||
    completedSets.loading ||
    sessions.loading ||
    active.loading

  return {
    repos,
    today,
    loading,
    profile: profile.data,
    settings: settings.data,
    plan: plan.data,
    exercises: exercises.data ?? [],
    exercisesById,
    completedSets: completedSets.data ?? [],
    history,
    sessions: sessions.data ?? [],
    active: active.data,
    bodyweightKg,
  }
}
