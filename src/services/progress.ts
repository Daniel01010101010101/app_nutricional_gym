import { movingAverage7 } from '@/domain/body/weightTrend'
import { evaluateDay } from '@/domain/checkin/adherence'
import { targetsForDay } from '@/domain/nutrition/dayTarget'
import { isWorkingSet } from '@/domain/progression/e1rm'
import { addDaysToKey, daysInRange, startOfWeekKey } from '@/domain/shared/dates'
import { weeklyVolume, type MuscleVolume } from '@/domain/training/volume'
import type { DayKey, Exercise, WorkoutSet } from '@/domain/types'
import type {
  BodyWeight,
  FoodLogEntry,
  Measurement,
  NutritionTargets,
  Profile,
  TrainingPlan,
  WorkoutSession,
} from '@/data/schemas'

import { bodyFatOf, targetsAt } from './checkin'
import { isTrainingDayFor, totalsOf } from './nutrition'

export type RangeKey = '4w' | '3m' | '6m' | 'all'

export const RANGE_LABEL: Record<RangeKey, string> = {
  '4w': '4 sem',
  '3m': '3 meses',
  '6m': '6 meses',
  all: 'Todo',
}

const RANGE_DAYS: Record<Exclude<RangeKey, 'all'>, number> = { '4w': 28, '3m': 91, '6m': 182 }

/** Primer día del rango (inclusive); `null` = desde el principio. */
export function rangeStart(range: RangeKey, today: DayKey): DayKey | null {
  return range === 'all' ? null : addDaysToKey(today, -(RANGE_DAYS[range] - 1))
}

const inRange = (date: DayKey, from: DayKey | null) => from === null || date >= from

/** Peso diario y promedio de 7 días (calculado con todo el historial y luego recortado al rango). */
export function weightChartData(weights: readonly BodyWeight[], from: DayKey | null) {
  return movingAverage7(weights.map((w) => ({ date: w.date, weightKg: w.weightKg })))
    .filter((p) => inRange(p.date, from))
    .map((p) => ({ date: p.date, weight: p.weightKg, avg7: p.avg7 }))
}

/** Una medición por día (la última registrada), en orden cronológico. */
function latestPerDay(measurements: readonly Measurement[]): Measurement[] {
  const byDate = new Map<DayKey, Measurement>()
  for (const m of [...measurements].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    byDate.set(m.date, { ...byDate.get(m.date), ...m })
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function waistChartData(measurements: readonly Measurement[], from: DayKey | null) {
  return latestPerDay(measurements)
    .filter((m) => m.waistCm !== undefined && inRange(m.date, from))
    .map((m) => ({ date: m.date, waist: m.waistCm as number }))
}

export function bodyFatChartData(
  measurements: readonly Measurement[],
  profile: Pick<Profile, 'sex' | 'heightCm'>,
  from: DayKey | null,
) {
  return latestPerDay(measurements)
    .filter((m) => inRange(m.date, from))
    .flatMap((m) => {
      const pct = bodyFatOf(m, profile)
      return pct === null ? [] : [{ date: m.date, bodyFat: pct }]
    })
}

/** Semanas (lunes) que cubre el rango, de la más antigua a la actual. */
export function weekStarts(from: DayKey, today: DayKey): DayKey[] {
  const weeks: DayKey[] = []
  for (let w = startOfWeekKey(from); w <= today; w = addDaysToKey(w, 7)) weeks.push(w)
  return weeks
}

/** Series de trabajo por semana. */
export function weeklySetCounts(sets: readonly WorkoutSet[], weeks: readonly DayKey[]) {
  return weeks.map((weekStart) => {
    const end = addDaysToKey(weekStart, 6)
    return {
      weekStart,
      sets: sets.filter((s) => isWorkingSet(s) && s.date >= weekStart && s.date <= end).length,
    }
  })
}

/** Series por músculo de una semana (principal 1, secundarios 0,5), igual que el plan. */
export function muscleVolumeOfWeek(
  sets: readonly WorkoutSet[],
  exercisesById: ReadonlyMap<string, Exercise>,
  weekStart: DayKey,
): MuscleVolume {
  const end = addDaysToKey(weekStart, 6)
  const entries = sets
    .filter((s) => isWorkingSet(s) && s.date >= weekStart && s.date <= end)
    .map((s) => ({ exerciseId: s.exerciseId, sets: 1 }))
  return weeklyVolume(entries, exercisesById)
}

/** % de días que cumplieron kcal (±10 %) y proteína (≥ 90 %) en cada semana; solo días ya pasados. */
export function weeklyNutritionAdherence(input: {
  logs: readonly FoodLogEntry[]
  targets: readonly NutritionTargets[]
  plan: TrainingPlan | undefined
  sessions: readonly WorkoutSession[]
  weeks: readonly DayKey[]
  today: DayKey
}) {
  const byDate = new Map<DayKey, FoodLogEntry[]>()
  for (const l of input.logs) byDate.set(l.date, [...(byDate.get(l.date) ?? []), l])
  return input.weeks.flatMap((weekStart) => {
    const dates = daysInRange(weekStart, addDaysToKey(weekStart, 6)).filter((d) => d <= input.today)
    const evaluated = dates.flatMap((date) => {
      const t = targetsAt(input.targets, date)
      if (!t) return []
      const day = targetsForDay(t, isTrainingDayFor(input.plan, input.sessions, date)).value
      const logs = byDate.get(date)
      const totals = logs ? totalsOf(logs) : null
      return [
        evaluateDay(
          totals ? { date, kcal: totals.kcal, protein: totals.protein } : undefined,
          day,
          date,
        ),
      ]
    })
    if (evaluated.length === 0) return []
    const pct = Math.round((evaluated.filter((d) => d.adherent).length / evaluated.length) * 100)
    return [
      { weekStart, pct, logged: evaluated.filter((d) => d.logged).length, days: evaluated.length },
    ]
  })
}

/** Cambio entre el primer y el último valor de una serie. */
export function changeOf<T>(points: readonly T[], value: (p: T) => number): number | null {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last || points.length < 2) return null
  return Math.round((value(last) - value(first)) * 100) / 100
}
