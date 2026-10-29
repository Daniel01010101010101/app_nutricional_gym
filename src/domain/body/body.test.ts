import { describe, expect, it } from 'vitest'

import {
  bodyFatCategory,
  explainLeanMass,
  fatMassKg,
  isReliableBodyFatMethod,
  leanMassKg,
} from './composition'
import { estimateBodyFatNavy, MeasurementError } from './navy'
import {
  averageBetween,
  movingAverage7,
  trendWeight,
  weekAverage,
  weeklyChangePct,
} from './weightTrend'

describe('composición corporal', () => {
  it('calcula masa magra y masa grasa', () => {
    expect(leanMassKg(80, 20)).toBe(64)
    expect(fatMassKg(80, 20)).toBe(16)
    expect(explainLeanMass(80, 20).value).toBe(64)
  })

  it('clasifica el % de grasa por bandas y sexo', () => {
    expect(bodyFatCategory('male', 14.9)).toBe('lean')
    expect(bodyFatCategory('male', 15)).toBe('moderate')
    expect(bodyFatCategory('male', 25)).toBe('moderate')
    expect(bodyFatCategory('male', 25.1)).toBe('high')
    expect(bodyFatCategory('female', 22)).toBe('lean')
    expect(bodyFatCategory('female', 30)).toBe('moderate')
    expect(bodyFatCategory('female', 33)).toBe('high')
  })

  it('distingue métodos fiables', () => {
    expect(isReliableBodyFatMethod('dexa')).toBe(true)
    expect(isReliableBodyFatMethod('bia-pro')).toBe(true)
    expect(isReliableBodyFatMethod('navy')).toBe(false)
    expect(isReliableBodyFatMethod('bia-home')).toBe(false)
  })
})

describe('US Navy', () => {
  it('estima el % de grasa en hombres', () => {
    const result = estimateBodyFatNavy({ sex: 'male', heightCm: 178, neckCm: 38, waistCm: 85 })
    expect(result.value).toBe(16.4)
    expect(result.explanation.formula).toContain('1.0324')
  })

  it('estima el % de grasa en mujeres con cadera', () => {
    const result = estimateBodyFatNavy({
      sex: 'female',
      heightCm: 165,
      neckCm: 32,
      waistCm: 75,
      hipCm: 98,
    })
    expect(result.value).toBe(28.9)
    expect(result.explanation.steps?.some((s) => s.label === 'Cadera')).toBe(true)
  })

  it('rechaza medidas incoherentes', () => {
    expect(() =>
      estimateBodyFatNavy({ sex: 'male', heightCm: 178, neckCm: 40, waistCm: 38 }),
    ).toThrow(MeasurementError)
    expect(() =>
      estimateBodyFatNavy({ sex: 'female', heightCm: 165, neckCm: 32, waistCm: 75 }),
    ).toThrow(/cadera/)
    expect(() =>
      estimateBodyFatNavy({ sex: 'female', heightCm: 165, neckCm: 200, waistCm: 75, hipCm: 90 }),
    ).toThrow(/mayor que el cuello/)
    // Valores fuera de lo plausible (p. ej. medidas en pulgadas)
    expect(() =>
      estimateBodyFatNavy({ sex: 'male', heightCm: 70, neckCm: 15, waistCm: 16 }),
    ).toThrow(/realista/)
  })
})

describe('tendencia de peso', () => {
  const entries = [
    { date: '2026-01-01', weightKg: 80 },
    { date: '2026-01-02', weightKg: 81 },
    { date: '2026-01-04', weightKg: 79 },
    { date: '2026-01-09', weightKg: 78 },
  ]

  it('calcula el promedio móvil de 7 días por calendario', () => {
    const trend = movingAverage7([...entries].reverse())
    expect(trend.map((p) => p.avg7)).toEqual([80, 80.5, 80, 78.5])
  })

  it('promedia períodos y semanas', () => {
    expect(averageBetween(entries, '2026-01-01', '2026-01-02')).toEqual({ average: 80.5, count: 2 })
    expect(averageBetween(entries, '2026-02-01', '2026-02-07')).toEqual({ average: null, count: 0 })
    expect(weekAverage(entries, '2026-01-01').average).toBe(80)
  })

  it('calcula el cambio semanal', () => {
    expect(weeklyChangePct(80, 79.6)).toBe(-0.5)
  })

  it('obtiene el peso de referencia de hoy', () => {
    expect(trendWeight(entries, '2026-01-09')).toBe(78.5)
    expect(trendWeight(entries, '2026-01-30')).toBe(78)
    expect(trendWeight([], '2026-01-30')).toBeNull()
  })
})
