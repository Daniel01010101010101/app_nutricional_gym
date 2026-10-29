import { roundTo } from '../shared/math'
import type { Food, MealRole, Nutrients } from '../types'
import { macroProfile, nutrientsFor } from './foods'
import { portionStep } from './mealPlanner'

export interface SwapOption {
  food: Food
  grams: number
  nutrients: Nutrients
  /** Distancia del perfil de macros (0 = idéntico). */
  distance: number
}

/** Macro que debe igualarse al intercambiar según el rol del alimento. */
const MATCH_KEY: Record<MealRole, keyof Nutrients> = {
  protein: 'protein',
  carb: 'carbs',
  fat: 'fat',
  vegetable: 'kcal',
  fruit: 'kcal',
}

/**
 * Busca equivalentes del mismo rol con perfil de macros parecido y calcula los gramos
 * que igualan el macro principal (proteína, carbos o grasa) del alimento original.
 */
export function findSwaps(
  original: Food,
  grams: number,
  role: MealRole,
  pool: readonly Food[],
  limit = 8,
): SwapOption[] {
  const key = MATCH_KEY[role]
  const targetAmount = nutrientsFor(original, grams)[key]
  const [p0, c0, f0] = macroProfile(original)

  return pool
    .filter((f) => f.id !== original.id && f.roles.includes(role) && f.per100g[key] > 0)
    .map((food) => {
      const raw = (targetAmount / food.per100g[key]) * 100
      const newGrams = Math.max(portionStep(food, raw), roundTo(raw, portionStep(food, raw)))
      const [p, c, f] = macroProfile(food)
      const distance = Math.hypot(p - p0, c - c0, f - f0)
      return { food, grams: newGrams, nutrients: nutrientsFor(food, newGrams), distance }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}
