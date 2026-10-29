import { addDaysToKey, daysBetween, isoWeekday, startOfWeekKey } from '../shared/dates'
import { hashString } from '../shared/math'
import type { DayKey, Weekday } from '../types'

export interface DayStatus {
  date: DayKey
  proteinMet: boolean
  isTrainingDay: boolean
  trained: boolean
}

/** Días seguidos cumpliendo la proteína (hoy cuenta si ya la cumpliste). */
export function proteinStreak(days: readonly DayStatus[], today: DayKey): number {
  const byDate = new Map(days.map((d) => [d.date, d]))
  let streak = 0
  let cursor = byDate.get(today)?.proteinMet ? today : addDaysToKey(today, -1)
  while (byDate.get(cursor)?.proteinMet) {
    streak++
    cursor = addDaysToKey(cursor, -1)
  }
  return streak
}

/** Entrenos planificados completados seguidos (los días de descanso no rompen la racha). */
export function trainingStreak(
  days: readonly DayStatus[],
  today: DayKey,
  maxLookbackDays = 120,
): number {
  const byDate = new Map(days.map((d) => [d.date, d]))
  let streak = 0
  for (let i = 0; i <= maxLookbackDays; i++) {
    const date = addDaysToKey(today, -i)
    const day = byDate.get(date)
    if (!day) continue
    if (day.trained) {
      streak++
      continue
    }
    if (day.isTrainingDay && i > 0) break
  }
  return streak
}

/** Consejo del día: determinista por fecha para que no cambie al recargar. */
export function pickDaily<T>(items: readonly T[], date: DayKey): T | undefined {
  if (items.length === 0) return undefined
  return items[hashString(date) % items.length]
}

export interface CheckinPeriod {
  /** Primer día de la semana evaluada. */
  weekStart: DayKey
  weekEnd: DayKey
}

/** Semana que evalúa el check-in pendiente: los 7 días previos al último día de check-in. */
export function checkinPeriod(today: DayKey, checkinWeekday: Weekday): CheckinPeriod {
  const lastCheckinDay = startOfWeekKey(today, checkinWeekday)
  return { weekStart: addDaysToKey(lastCheckinDay, -7), weekEnd: addDaysToKey(lastCheckinDay, -1) }
}

export interface ReminderInput {
  today: DayKey
  hasWeightToday: boolean
  checkinWeekday: Weekday
  completedCheckinWeekStarts: readonly DayKey[]
  startedOn: DayKey
}

export interface Reminders {
  weighIn: boolean
  checkinDue: boolean
  period: CheckinPeriod
  isCheckinDay: boolean
}

/** Mínimo de días con la app en la semana evaluada para pedir check-in. */
const MIN_DAYS_IN_PERIOD = 4

export function reminders(input: ReminderInput): Reminders {
  const period = checkinPeriod(input.today, input.checkinWeekday)
  const daysTracked = daysBetween(input.startedOn, period.weekEnd) + 1
  const checkinDue =
    daysTracked >= MIN_DAYS_IN_PERIOD &&
    !input.completedCheckinWeekStarts.includes(period.weekStart)
  return {
    weighIn: !input.hasWeightToday,
    checkinDue,
    period,
    isCheckinDay: isoWeekday(input.today) === input.checkinWeekday,
  }
}
