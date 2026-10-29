import { z } from 'zod'

import { exerciseSchema, foodSchema } from '../schemas'
import { EXERCISES_DATA } from './exercises.data'
import { FOODS_DATA } from './foods.data'
import { TIPS_DATA, type Tip } from './tips.data'

export const SEED_VERSION = 1

export const tipSchema = z.object({
  id: z.string(),
  category: z.enum(['nutricion', 'entreno', 'recuperacion', 'mentalidad']),
  text: z.string().min(10).max(220),
  source: z.string().optional(),
})

export interface SeedReport {
  foods: number
  exercises: number
  tips: number
  errors: string[]
}

function uniqueIds(items: readonly { id: string }[], label: string): string[] {
  const seen = new Set<string>()
  const errors: string[] = []
  for (const { id } of items) {
    if (seen.has(id)) errors.push(`${label}: id duplicado «${id}»`)
    seen.add(id)
  }
  return errors
}

/** Valida los catálogos con Zod y revisa coherencia básica (ids únicos, kcal vs macros). */
export function validateSeeds(): SeedReport {
  const errors: string[] = []
  for (const food of FOODS_DATA) {
    const result = foodSchema.safeParse(food)
    if (!result.success) errors.push(`Alimento ${food.id}: ${result.error.message}`)
    const { kcal, protein, carbs, fat } = food.per100g
    const atwater = protein * 4 + carbs * 4 + fat * 9
    // El alcohol (cerveza) aporta kcal fuera de los macros.
    if (food.id !== 'cerveza' && Math.abs(atwater - kcal) > Math.max(30, kcal * 0.2)) {
      errors.push(
        `Alimento ${food.id}: kcal (${kcal}) no coincide con los macros (${Math.round(atwater)})`,
      )
    }
    for (const role of food.roles) {
      if (food.slots.length === 0)
        errors.push(`Alimento ${food.id}: tiene rol ${role} pero ningún momento del día`)
    }
  }
  for (const exercise of EXERCISES_DATA) {
    const result = exerciseSchema.safeParse(exercise)
    if (!result.success) errors.push(`Ejercicio ${exercise.id}: ${result.error.message}`)
  }
  for (const tip of TIPS_DATA) {
    const result = tipSchema.safeParse(tip)
    if (!result.success) errors.push(`Consejo ${tip.id}: ${result.error.message}`)
  }
  errors.push(
    ...uniqueIds(FOODS_DATA, 'Alimentos'),
    ...uniqueIds(EXERCISES_DATA, 'Ejercicios'),
    ...uniqueIds(TIPS_DATA, 'Consejos'),
  )
  return {
    foods: FOODS_DATA.length,
    exercises: EXERCISES_DATA.length,
    tips: TIPS_DATA.length,
    errors,
  }
}

export { EXERCISES_DATA, FOODS_DATA, TIPS_DATA, type Tip }
