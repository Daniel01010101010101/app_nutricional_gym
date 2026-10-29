import { roundDecimals } from '../shared/math'
import { normalizeText } from '../shared/text'
import type { Allergen, Budget, DietRestriction, Food, Nutrients } from '../types'

export const EMPTY_NUTRIENTS: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }

export function nutrientsFor(food: Pick<Food, 'per100g'>, grams: number): Nutrients {
  const f = grams / 100
  return {
    kcal: roundDecimals(food.per100g.kcal * f, 1),
    protein: roundDecimals(food.per100g.protein * f, 1),
    carbs: roundDecimals(food.per100g.carbs * f, 1),
    fat: roundDecimals(food.per100g.fat * f, 1),
    fiber: roundDecimals(food.per100g.fiber * f, 1),
  }
}

export function sumNutrients(list: readonly Nutrients[]): Nutrients {
  const total = list.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
      fiber: acc.fiber + n.fiber,
    }),
    EMPTY_NUTRIENTS,
  )
  return {
    kcal: roundDecimals(total.kcal, 1),
    protein: roundDecimals(total.protein, 1),
    carbs: roundDecimals(total.carbs, 1),
    fat: roundDecimals(total.fat, 1),
    fiber: roundDecimals(total.fiber, 1),
  }
}

export interface FoodPreferences {
  restrictions: DietRestriction[]
  allergens: Allergen[]
  dislikedFoodIds: string[]
  budget: Budget
}

const BUDGET_RANK: Record<Budget, number> = { low: 0, medium: 1, high: 2 }

/** ¿El alimento respeta restricciones, alergias y gustos? (El presupuesto se evalúa aparte.) */
export function isFoodAllowed(food: Food, prefs: FoodPreferences): boolean {
  if (prefs.dislikedFoodIds.includes(food.id)) return false
  if (food.allergens.some((a) => prefs.allergens.includes(a))) return false
  for (const restriction of prefs.restrictions) {
    if (restriction === 'vegetarian' && !food.diet.vegetarian) return false
    if (restriction === 'vegan' && !food.diet.vegan) return false
    if (restriction === 'lactose-free' && food.diet.lactose) return false
    if (restriction === 'gluten-free' && food.diet.gluten) return false
  }
  return true
}

export function fitsBudget(food: Food, budget: Budget): boolean {
  return BUDGET_RANK[food.cost] <= BUDGET_RANK[budget]
}

/** Calorías que aporta cada macro como fracción del total (para comparar alimentos). */
export function macroProfile(food: Pick<Food, 'per100g'>): [number, number, number] {
  const { protein, carbs, fat } = food.per100g
  const total = protein * 4 + carbs * 4 + fat * 9
  if (total === 0) return [0, 0, 0]
  return [(protein * 4) / total, (carbs * 4) / total, (fat * 9) / total]
}

/** Búsqueda tolerante: todas las palabras de la consulta deben aparecer (sin tildes). */
export function searchFoods(foods: readonly Food[], query: string, limit = 30): Food[] {
  const terms = normalizeText(query).split(' ').filter(Boolean)
  if (terms.length === 0) return foods.slice(0, limit)
  const scored = foods
    .map((food) => {
      const name = normalizeText(food.name)
      if (!terms.every((t) => name.includes(t))) return null
      const score = (name.startsWith(terms[0] as string) ? 0 : 1) + name.length / 1000
      return { food, score }
    })
    .filter((x): x is { food: Food; score: number } => x !== null)
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.food)
}
