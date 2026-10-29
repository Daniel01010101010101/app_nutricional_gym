import { addDaysToKey, daysBetween } from '../shared/dates'
import { mean, percentChange, roundDecimals } from '../shared/math'
import type { DayKey } from '../types'

export interface WeightEntry {
  date: DayKey
  weightKg: number
}

export interface WeightTrendPoint extends WeightEntry {
  /** Promedio de los registros de los últimos 7 días (incluido este). */
  avg7: number
}

function sortByDate<T extends { date: DayKey }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}

/** Promedio móvil de 7 días por calendario: el peso de un solo día importa poco; la tendencia, mucho. */
export function movingAverage7(entries: readonly WeightEntry[]): WeightTrendPoint[] {
  const sorted = sortByDate(entries)
  return sorted.map((entry) => {
    const window = sorted.filter((e) => {
      const diff = daysBetween(e.date, entry.date)
      return diff >= 0 && diff < 7
    })
    const avg = mean(window.map((e) => e.weightKg)) as number
    return { ...entry, avg7: roundDecimals(avg, 2) }
  })
}

export interface PeriodAverage {
  average: number | null
  count: number
}

/** Promedio de los registros entre `from` y `to` (incluidos). */
export function averageBetween(
  entries: readonly WeightEntry[],
  from: DayKey,
  to: DayKey,
): PeriodAverage {
  const inRange = entries.filter((e) => e.date >= from && e.date <= to)
  const average = mean(inRange.map((e) => e.weightKg))
  return { average: average === null ? null : roundDecimals(average, 2), count: inRange.length }
}

/** Promedio de la semana de 7 días que empieza en `weekStart`. */
export function weekAverage(entries: readonly WeightEntry[], weekStart: DayKey): PeriodAverage {
  return averageBetween(entries, weekStart, addDaysToKey(weekStart, 6))
}

/** Cambio semanal en % (negativo = pérdida). */
export function weeklyChangePct(previousAvg: number, currentAvg: number): number {
  return roundDecimals(percentChange(previousAvg, currentAvg), 2)
}

/** Peso de referencia hoy: promedio de los últimos 7 días o, si no hay, el último registro. */
export function trendWeight(entries: readonly WeightEntry[], today: DayKey): number | null {
  const recent = averageBetween(entries, addDaysToKey(today, -6), today)
  if (recent.average !== null) return recent.average
  const past = sortByDate(entries.filter((e) => e.date <= today))
  const last = past.at(-1)
  return last ? last.weightKg : null
}
