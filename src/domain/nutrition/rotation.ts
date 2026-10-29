import { ROTATION } from '../constants/formulas'
import { seededRandom } from '../shared/math'
import type { Food, MealRole, MealSlotKind } from '../types'

const KINDS: readonly MealSlotKind[] = ['breakfast', 'lunch', 'dinner', 'snack']
const ROLES: readonly MealRole[] = ['protein', 'carb', 'fat', 'vegetable', 'fruit']

function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j] as T, copy[i] as T]
  }
  return copy
}

const isDense = (f: Food) => f.per100g.protein >= ROTATION.denseProteinPer100g
const isLean = (f: Food) => f.per100g.fat <= ROTATION.leanFatPer100g

/**
 * Alimentos de la semana: para cada momento del día y rol se eligen unos pocos (reutilizando
 * los ya elegidos para otros momentos). Las proteínas incluyen siempre una fuente densa y magra
 * (útil antes y después de entrenar) y otra densa; los carbos del snack, al menos uno magro.
 */
export function weeklyFoodPool(foods: readonly Food[], seed: number): Food[] {
  const random = seededRandom(seed)
  const shuffled = shuffle(foods, random)
  const chosen = new Set<string>()

  const ensure = (options: readonly Food[], count: number) => {
    let have = options.filter((f) => chosen.has(f.id)).length
    for (const f of options) {
      if (have >= count) return
      if (chosen.has(f.id)) continue
      chosen.add(f.id)
      have++
    }
  }

  for (const kind of KINDS) {
    for (const role of ROLES) {
      const options = shuffled.filter((f) => f.roles.includes(role) && f.slots.includes(kind))
      if (role === 'protein') {
        ensure(
          options.filter((f) => isDense(f) && isLean(f)),
          1,
        )
        ensure(options.filter(isDense), 2)
      }
      if (role === 'carb' && kind === 'snack') ensure(options.filter(isLean), 1)
      ensure(options, ROTATION.perSlot[role])
    }
  }
  return foods.filter((f) => chosen.has(f.id))
}
