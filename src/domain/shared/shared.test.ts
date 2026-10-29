import { describe, expect, it } from 'vitest'

import {
  addDaysToKey,
  currentAge,
  daysBetween,
  daysInRange,
  isoWeekday,
  minutesToTime,
  parseDayKey,
  startOfWeekKey,
  timeToMinutes,
  toDayKey,
} from './dates'
import { fmt, fmtKg, fmtPct } from './format'
import {
  ceilTo,
  clamp,
  floorTo,
  hashString,
  mean,
  movingAverage,
  percentChange,
  roundDecimals,
  roundTo,
  seededRandom,
  sum,
} from './math'
import { fromKg, kgToLb, lbToKg, toKg } from './units'

describe('math', () => {
  it('redondea a múltiplos sin ruido de coma flotante', () => {
    expect(roundTo(1767.5, 25)).toBe(1775)
    expect(roundTo(176, 5)).toBe(175)
    expect(roundTo(2.27, 0.5)).toBe(2.5)
    expect(floorTo(79.9, 2.5)).toBe(77.5)
    expect(floorTo(80, 2.5)).toBe(80)
    expect(ceilTo(1801, 25)).toBe(1825)
    expect(ceilTo(1800, 25)).toBe(1800)
    expect(roundDecimals(0.1 + 0.2)).toBe(0.3)
    expect(roundDecimals(1.2345, 2)).toBe(1.23)
  })

  it('acota, suma, promedia y calcula cambios', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(sum([1, 2, 3])).toBe(6)
    expect(mean([])).toBeNull()
    expect(mean([2, 4])).toBe(3)
    expect(percentChange(100, 95)).toBe(-5)
    expect(movingAverage([1, 2, 3, 4], 3)).toEqual([1, 1.5, 2, 3])
  })

  it('genera números pseudoaleatorios reproducibles', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const first = a()
    expect(first).toBe(b())
    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThan(1)
    expect(hashString('2026-01-01')).toBe(hashString('2026-01-01'))
    expect(hashString('a')).not.toBe(hashString('b'))
  })
})

describe('units', () => {
  it('convierte kg y lb', () => {
    expect(lbToKg(45)).toBeCloseTo(20.41, 2)
    expect(kgToLb(100)).toBeCloseTo(220.46, 2)
    expect(toKg(80, 'kg')).toBe(80)
    expect(toKg(100, 'lb')).toBeCloseTo(45.36, 2)
    expect(fromKg(80, 'kg')).toBe(80)
    expect(fromKg(20, 'lb')).toBeCloseTo(44.09, 2)
  })
})

describe('dates', () => {
  it('convierte entre Date y DayKey', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(parseDayKey('2026-01-05').getDate()).toBe(5)
    expect(addDaysToKey('2026-01-31', 1)).toBe('2026-02-01')
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7)
  })

  it('calcula días de la semana ISO e inicio de semana', () => {
    expect(isoWeekday('2026-01-05')).toBe(1) // lunes
    expect(isoWeekday('2026-01-11')).toBe(7) // domingo
    expect(startOfWeekKey('2026-01-08')).toBe('2026-01-05')
    expect(startOfWeekKey('2026-01-05', 1)).toBe('2026-01-05')
    expect(startOfWeekKey('2026-01-08', 7)).toBe('2026-01-04')
  })

  it('lista rangos de días', () => {
    expect(daysInRange('2026-01-01', '2026-01-03')).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ])
    expect(daysInRange('2026-01-03', '2026-01-01')).toEqual([])
  })

  it('actualiza la edad con el paso del tiempo', () => {
    expect(currentAge(30, '2025-01-01', '2026-06-01')).toBe(31)
    expect(currentAge(30, '2026-06-01', '2025-01-01')).toBe(30)
  })

  it('convierte horas y minutos', () => {
    expect(timeToMinutes('18:30')).toBe(1110)
    expect(timeToMinutes('7')).toBe(420)
    expect(timeToMinutes('')).toBe(0)
    expect(minutesToTime(1110)).toBe('18:30')
    expect(minutesToTime(-30)).toBe('23:30')
  })
})

describe('format', () => {
  it('formatea en español con coma decimal', () => {
    expect(fmt(1767.5, 1)).toBe('1767,5')
    expect(fmt(12500)).toBe('12.500')
    expect(fmtPct(15)).toBe('15 %')
    expect(fmtKg(80.25)).toBe('80,3 kg')
  })
})
