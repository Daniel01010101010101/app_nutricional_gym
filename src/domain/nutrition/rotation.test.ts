import { describe, expect, it } from 'vitest'

import { FOODS } from '@/test/fixtures'

import { weeklyFoodPool } from './rotation'

describe('rotación semanal de alimentos', () => {
  it('elige un subconjunto determinista del catálogo', () => {
    const pool = weeklyFoodPool(FOODS, 42)
    expect(pool.length).toBeGreaterThan(0)
    expect(pool.length).toBeLessThanOrEqual(FOODS.length)
    expect(pool.every((f) => FOODS.includes(f))).toBe(true)
    expect(weeklyFoodPool(FOODS, 42).map((f) => f.id)).toEqual(pool.map((f) => f.id))
  })

  it('cubre cada rol en cada momento del día cuando el catálogo lo permite', () => {
    const pool = weeklyFoodPool(FOODS, 7)
    for (const kind of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
      for (const role of ['protein', 'carb', 'fat'] as const) {
        const available = FOODS.some((f) => f.roles.includes(role) && f.slots.includes(kind))
        const covered = pool.some((f) => f.roles.includes(role) && f.slots.includes(kind))
        expect(covered).toBe(available)
      }
      const proteins = pool.filter((f) => f.roles.includes('protein') && f.slots.includes(kind))
      if (proteins.length > 0) expect(proteins.some((f) => f.per100g.protein >= 10)).toBe(true)
    }
  })

  it('con catálogo vacío devuelve vacío', () => {
    expect(weeklyFoodPool([], 1)).toEqual([])
  })
})
