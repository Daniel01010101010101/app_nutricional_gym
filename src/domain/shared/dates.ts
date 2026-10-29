import { addDays, differenceInCalendarDays, format, getISODay } from 'date-fns'

import type { DayKey, Weekday } from '../types'

export function toDayKey(date: Date): DayKey {
  return format(date, 'yyyy-MM-dd')
}

/** Convierte 'yyyy-MM-dd' a la medianoche local de ese día. */
export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

export function addDaysToKey(key: DayKey, days: number): DayKey {
  return toDayKey(addDays(parseDayKey(key), days))
}

/** Días de calendario de `from` a `to` (positivo si `to` es posterior). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return differenceInCalendarDays(parseDayKey(to), parseDayKey(from))
}

export function isoWeekday(key: DayKey): Weekday {
  return getISODay(parseDayKey(key)) as Weekday
}

/** Inicio de la semana que contiene `key`, con semanas que empiezan en `weekStartsOn`. */
export function startOfWeekKey(key: DayKey, weekStartsOn: Weekday = 1): DayKey {
  const offset = (isoWeekday(key) - weekStartsOn + 7) % 7
  return addDaysToKey(key, -offset)
}

/** Todos los días entre `from` y `to`, ambos incluidos. */
export function daysInRange(from: DayKey, to: DayKey): DayKey[] {
  const total = daysBetween(from, to)
  return Array.from({ length: Math.max(0, total + 1) }, (_, i) => addDaysToKey(from, i))
}

/** Edad actual a partir de la edad declarada y el día en que se declaró. */
export function currentAge(declaredAge: number, declaredOn: DayKey, today: DayKey): number {
  return declaredAge + Math.max(0, Math.floor(daysBetween(declaredOn, today) / 365.25))
}

/** Minutos desde medianoche de una hora 'HH:mm'. */
export function timeToMinutes(time: string): number {
  const [h, m = 0] = time.split(':').map(Number) as [number, number?]
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
