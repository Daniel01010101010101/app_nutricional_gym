import { describe, expect, it } from 'vitest'

import {
  barbellLoads,
  DEFAULT_LOADING,
  LB_PLATES,
  nextLoadable,
  plateBreakdown,
  reducedLoadable,
  roundToLoadable,
  type LoadingSettings,
} from './loading'

const LB_GYM: LoadingSettings = {
  ...DEFAULT_LOADING,
  bar: { value: 45, unit: 'lb' },
  plates: { unit: 'lb', values: LB_PLATES },
  dumbbellIncrement: { value: 5, unit: 'lb' },
}

describe('cargas posibles en barra', () => {
  it('con discos en kg sube de a 2.5 kg', () => {
    const loads = barbellLoads(DEFAULT_LOADING)
    expect(loads.slice(0, 4)).toEqual([20, 22.5, 25, 27.5])
  })

  it('con discos en libras sube de a 5 lb (≈2.27 kg)', () => {
    const loads = barbellLoads(LB_GYM)
    expect(loads[0]).toBeCloseTo(20.41, 2)
    expect(loads[1]! - loads[0]!).toBeCloseTo(2.27, 2)
  })

  it('solo combinaciones reales de los discos disponibles', () => {
    const loads = barbellLoads({ ...DEFAULT_LOADING, plates: { unit: 'kg', values: [20, 15] } })
    expect(loads.slice(0, 5)).toEqual([20, 50, 60, 80, 90])
    expect(barbellLoads({ ...DEFAULT_LOADING, plates: { unit: 'kg', values: [] } })).toEqual([20])
  })
})

describe('redondeo a lo cargable', () => {
  it('barra: más cercano, hacia abajo o hacia arriba', () => {
    expect(roundToLoadable(81, 'barbell', DEFAULT_LOADING)).toBe(80)
    expect(roundToLoadable(81.3, 'barbell', DEFAULT_LOADING)).toBe(82.5)
    expect(roundToLoadable(81.3, 'barbell', DEFAULT_LOADING, 'down')).toBe(80)
    expect(roundToLoadable(80.1, 'barbell', DEFAULT_LOADING, 'up')).toBe(82.5)
    expect(roundToLoadable(10, 'barbell', DEFAULT_LOADING)).toBe(20)
    expect(roundToLoadable(10, 'barbell', DEFAULT_LOADING, 'down')).toBe(20)
    expect(roundToLoadable(9999, 'barbell', DEFAULT_LOADING)).toBe(520)
    expect(roundToLoadable(9999, 'barbell', DEFAULT_LOADING, 'up')).toBe(520)
  })

  it('mancuernas, máquinas, lastre y carga fija', () => {
    expect(roundToLoadable(23, 'dumbbell', DEFAULT_LOADING)).toBe(24)
    expect(roundToLoadable(23, 'dumbbell', DEFAULT_LOADING, 'down')).toBe(22)
    expect(roundToLoadable(22.1, 'dumbbell', DEFAULT_LOADING, 'up')).toBe(24)
    expect(roundToLoadable(37, 'stack', DEFAULT_LOADING)).toBe(35)
    expect(roundToLoadable(10.6, 'bodyweight', DEFAULT_LOADING)).toBe(10)
    expect(roundToLoadable(16.3, 'fixed', DEFAULT_LOADING)).toBe(16.5)
    expect(roundToLoadable(-3, 'stack', DEFAULT_LOADING)).toBe(0)
    expect(roundToLoadable(10, 'dumbbell', LB_GYM)).toBeCloseTo(9.07, 2)
  })
})

describe('siguiente peso y bajadas', () => {
  it('sube al siguiente peso cargable, nunca igual', () => {
    expect(nextLoadable(80, 2.5, 'barbell', DEFAULT_LOADING)).toBe(82.5)
    expect(nextLoadable(80, 1, 'barbell', DEFAULT_LOADING)).toBe(82.5)
    expect(
      nextLoadable(20, 2.5, 'barbell', { ...DEFAULT_LOADING, plates: { unit: 'kg', values: [] } }),
    ).toBe(20)
    expect(nextLoadable(20, 1, 'dumbbell', DEFAULT_LOADING)).toBe(22)
    expect(nextLoadable(20, 0.5, 'dumbbell', DEFAULT_LOADING)).toBe(22)
  })

  it('baja un porcentaje redondeando hacia abajo', () => {
    expect(reducedLoadable(100, 0.1, 'barbell', DEFAULT_LOADING)).toBe(90)
    expect(reducedLoadable(21, 0.05, 'dumbbell', DEFAULT_LOADING)).toBe(18)
    expect(reducedLoadable(20, 0.1, 'barbell', DEFAULT_LOADING)).toBe(20)
  })
})

describe('discos por lado', () => {
  it('reparte los discos de mayor a menor', () => {
    expect(plateBreakdown(100, DEFAULT_LOADING)).toEqual({
      perSide: [25, 15],
      unit: 'kg',
      remainderKg: 0,
    })
    expect(plateBreakdown(15, DEFAULT_LOADING)).toBeNull()
  })

  it('funciona con libras y avisa si no se puede completar', () => {
    expect(plateBreakdown(102.06, LB_GYM)?.perSide).toEqual([45, 45])
    expect(
      plateBreakdown(70, { ...DEFAULT_LOADING, plates: { unit: 'kg', values: [20] } }),
    ).toEqual({
      perSide: [20],
      unit: 'kg',
      remainderKg: 10,
    })
  })
})
