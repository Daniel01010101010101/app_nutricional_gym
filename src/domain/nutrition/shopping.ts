import { ceilTo, roundDecimals } from '../shared/math'
import { fmt } from '../shared/format'
import type { Food, ShoppingSection } from '../types'
import type { PlanItem } from './mealPlanner'

export interface ShoppingItem {
  food: Food
  totalGrams: number
  /** Cantidad de compra legible: "1,4 kg", "14 unidades", "450 g". */
  quantity: string
}

export interface ShoppingGroup {
  section: ShoppingSection
  label: string
  items: ShoppingItem[]
}

export const SECTION_LABEL: Record<ShoppingSection, string> = {
  carnes: 'Carnes y pollo',
  pescados: 'Pescados y mariscos',
  'huevos-lacteos': 'Huevos y lácteos',
  'frutas-verduras': 'Frutas y verduras',
  'granos-cereales': 'Granos y cereales',
  panaderia: 'Panadería y arepas',
  despensa: 'Despensa',
  suplementos: 'Suplementos',
}

const SECTION_ORDER: ShoppingSection[] = [
  'carnes',
  'pescados',
  'huevos-lacteos',
  'frutas-verduras',
  'granos-cereales',
  'panaderia',
  'despensa',
  'suplementos',
]

export function purchaseQuantity(food: Food, grams: number): string {
  if (food.purchase) {
    const count = Math.ceil(roundDecimals(grams / food.purchase.grams, 3))
    return `${count} ${food.purchase.label}`
  }
  if (grams >= 1000) return `${fmt(ceilTo(grams / 1000, 0.1), 1)} kg`
  return `${fmt(ceilTo(grams, 50))} g`
}

/** Agrupa todos los alimentos de varios días por sección del supermercado. */
export function buildShoppingList(
  days: readonly (readonly PlanItem[])[],
  foods: readonly Food[],
): ShoppingGroup[] {
  const foodsById = new Map(foods.map((f) => [f.id, f]))
  const totals = new Map<string, number>()
  for (const item of days.flat()) {
    totals.set(item.foodId, (totals.get(item.foodId) ?? 0) + item.grams)
  }

  const groups = new Map<ShoppingSection, ShoppingItem[]>()
  for (const [foodId, totalGrams] of totals) {
    const food = foodsById.get(foodId)
    if (!food) continue
    const list = groups.get(food.section) ?? []
    list.push({
      food,
      totalGrams: roundDecimals(totalGrams, 1),
      quantity: purchaseQuantity(food, totalGrams),
    })
    groups.set(food.section, list)
  }

  return SECTION_ORDER.filter((s) => groups.has(s)).map((section) => ({
    section,
    label: SECTION_LABEL[section],
    items: (groups.get(section) as ShoppingItem[]).sort((a, b) =>
      a.food.name.localeCompare(b.food.name, 'es'),
    ),
  }))
}
