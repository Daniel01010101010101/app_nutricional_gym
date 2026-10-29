import { format, formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'

import { parseDayKey } from '@/domain/shared/dates'
import { fmt } from '@/domain/shared/format'
import { fromKg } from '@/domain/shared/units'
import type { DayKey, WeightUnit } from '@/domain/types'

/** Convierte texto con coma o punto decimal a número; `undefined` si está vacío o no es válido. */
export function parseDecimal(text: string): number | undefined {
  const normalized = text.trim().replace(',', '.')
  if (normalized === '' || normalized === '.' || normalized === '-') return undefined
  const value = Number(normalized)
  return Number.isFinite(value) ? value : undefined
}

export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  return `${fmt(fromKg(kg, unit), decimals)} ${unit}`
}

export function formatDay(key: DayKey, pattern = "EEEE d 'de' MMMM"): string {
  return format(parseDayKey(key), pattern, { locale: es })
}

export function formatShortDay(key: DayKey): string {
  return format(parseDayKey(key), 'd MMM', { locale: es })
}

export function formatRelative(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { locale: es, addSuffix: true })
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
