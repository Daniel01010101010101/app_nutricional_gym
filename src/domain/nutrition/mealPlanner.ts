import { MEALS } from '../constants/formulas'
import { roundDecimals, roundTo, seededRandom } from '../shared/math'
import type { Food, Macros, MealRole, Nutrients } from '../types'
import { nutrientsFor, sumNutrients } from './foods'
import type { MealTarget } from './meals'

export interface PlanItem {
  foodId: string
  grams: number
  role: MealRole
}

export interface PlannedMeal extends MealTarget {
  items: PlanItem[]
}

export interface MacroDeviation {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface DayMealPlan {
  meals: PlannedMeal[]
  totals: Nutrients
  target: Macros
  /** Desviación relativa por macro (0.03 = 3 %). */
  deviation: MacroDeviation
  withinTolerance: boolean
}

type FixedRole = 'vegetable' | 'fruit'
type SolvedRole = Exclude<MealRole, FixedRole>

/** Porciones fijas (g) de los acompañantes que no se optimizan. */
const FIXED_PORTION: Record<FixedRole, number> = { vegetable: 120, fruit: 120 }

function isFixedRole(role: MealRole): role is FixedRole {
  return role === 'vegetable' || role === 'fruit'
}

/** Tope de cada macro por alimento y comida: evita porciones absurdas. */
const MACRO_CAP: Record<SolvedRole, { key: keyof Macros; max: number }> = {
  protein: { key: 'protein', max: 60 },
  carb: { key: 'carbs', max: 120 },
  fat: { key: 'fat', max: 30 },
}

const ABSOLUTE_MAX_GRAMS = 450
const LOW_FAT_PER_100G = 10
const IMPORTANCE = { kcal: 1, protein: 2, carbs: 1, fat: 1 } as const

type Template = MealRole[]

function templateFor(meal: MealTarget): Template {
  if (meal.isPreWorkout) return ['protein', 'carb']
  switch (meal.kind) {
    case 'breakfast':
      return ['protein', 'carb', 'fruit', 'fat']
    case 'lunch':
    case 'dinner':
      return ['protein', 'carb', 'vegetable', 'fat']
    case 'snack':
      return meal.isPostWorkout ? ['protein', 'carb'] : ['protein', 'carb', 'fat']
  }
}

export function candidatesFor(foods: readonly Food[], role: MealRole, meal: MealTarget): Food[] {
  const base = foods.filter((f) => f.roles.includes(role) && f.slots.includes(meal.kind))
  if ((meal.isPreWorkout || meal.isPostWorkout) && (role === 'protein' || role === 'carb')) {
    const lean = base.filter((f) => f.per100g.fat <= LOW_FAT_PER_100G)
    if (lean.length > 0) return lean
  }
  return base
}

export function portionStep(food: Food, grams: number): number {
  const unit = food.measures.find(
    (m) => m.label.startsWith('1 unidad') || m.label.startsWith('1 scoop'),
  )
  if (unit && unit.grams <= 80) return unit.grams
  return grams > 150 ? 10 : 5
}

/** Gramos máximos de un alimento en una comida según el tope de su macro principal. */
export function maxGramsFor(food: Food, role: SolvedRole): number {
  const cap = MACRO_CAP[role]
  const density = food.per100g[cap.key] / 100
  return density > 0 ? Math.min(ABSOLUTE_MAX_GRAMS, cap.max / density) : ABSOLUTE_MAX_GRAMS
}

interface Variable {
  food: Food
  role: MealRole
  lo: number
  hi: number
  grams: number
}

const MACRO_KEYS = ['protein', 'carbs', 'fat'] as const

/**
 * Optimiza los gramos de cada alimento para acercarse a los macros objetivo
 * (mínimos cuadrados ponderados con cotas, por descenso coordenado).
 */
export function solveGrams(
  target: Omit<Macros, 'kcal'>,
  variables: Variable[],
  sweeps = 150,
): void {
  const weights = MACRO_KEYS.map((k) => IMPORTANCE[k] / Math.max(target[k], 5) ** 2)
  for (let sweep = 0; sweep < sweeps; sweep++) {
    for (const v of variables) {
      let numerator = 0
      let denominator = 0
      MACRO_KEYS.forEach((key, k) => {
        const coefficient = v.food.per100g[key] / 100
        const others = variables.reduce(
          (acc, o) => (o === v ? acc : acc + (o.food.per100g[key] / 100) * o.grams),
          0,
        )
        numerator += (weights[k] as number) * coefficient * (target[key] - others)
        denominator += (weights[k] as number) * coefficient * coefficient
      })
      v.grams = denominator === 0 ? v.lo : Math.min(v.hi, Math.max(v.lo, numerator / denominator))
    }
  }
}

function deviationOf(totals: Macros, target: Macros): MacroDeviation {
  const rel = (a: number, t: number) => (t === 0 ? 0 : roundDecimals((a - t) / t, 4))
  return {
    kcal: rel(totals.kcal, target.kcal),
    protein: rel(totals.protein, target.protein),
    carbs: rel(totals.carbs, target.carbs),
    fat: rel(totals.fat, target.fat),
  }
}

function errorOf(d: MacroDeviation): number {
  return (
    IMPORTANCE.kcal * d.kcal ** 2 +
    IMPORTANCE.protein * d.protein ** 2 +
    IMPORTANCE.carbs * d.carbs ** 2 +
    IMPORTANCE.fat * d.fat ** 2
  )
}

export function isWithinTolerance(
  d: MacroDeviation,
  tolerance: number = MEALS.planTolerance,
): boolean {
  return [d.kcal, d.protein, d.carbs, d.fat].every((x) => Math.abs(x) <= tolerance + 1e-9)
}

export function mealTotals(
  items: readonly PlanItem[],
  foodsById: ReadonlyMap<string, Food>,
): Nutrients {
  return sumNutrients(
    items.map((item) => {
      const food = foodsById.get(item.foodId)
      return food
        ? nutrientsFor(food, item.grams)
        : { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    }),
  )
}

function pick<T>(list: readonly T[], random: () => number): T | undefined {
  return list[Math.floor(random() * list.length)]
}

interface BuiltMeal {
  meal: PlannedMeal
  variables: Variable[]
}

function buildMeal(
  meal: MealTarget,
  foods: readonly Food[],
  seed: number,
  usedProteins: Set<string>,
): BuiltMeal {
  const random = seededRandom(seed)
  const variables: Variable[] = []
  const fixed: PlanItem[] = []

  for (const role of templateFor(meal)) {
    const all = candidatesFor(foods, role, meal)
    const fresh = role === 'protein' ? all.filter((f) => !usedProteins.has(f.id)) : all
    const food = pick(fresh.length > 0 ? fresh : all, random)
    if (!food) continue
    if (role === 'protein') usedProteins.add(food.id)
    if (isFixedRole(role)) {
      fixed.push({ foodId: food.id, grams: FIXED_PORTION[role], role })
    } else {
      variables.push({
        food,
        role,
        lo: role === 'fat' ? 0 : 20,
        hi: maxGramsFor(food, role),
        grams: 50,
      })
    }
  }

  const fixedFoods = new Map(foods.map((f) => [f.id, f]))
  const fixedTotals = mealTotals(fixed, fixedFoods)
  solveGrams(
    {
      protein: meal.target.protein - fixedTotals.protein,
      carbs: meal.target.carbs - fixedTotals.carbs,
      fat: meal.target.fat - fixedTotals.fat,
    },
    variables,
  )
  for (const v of variables) {
    v.grams = roundTo(v.grams, portionStep(v.food, v.grams))
  }
  return { meal: { ...meal, items: fixed }, variables }
}

function itemsOf(built: BuiltMeal): PlanItem[] {
  return [
    ...built.variables
      .filter((v) => v.grams > 0)
      .map((v) => ({ foodId: v.food.id, grams: roundDecimals(v.grams, 1), role: v.role })),
    ...built.meal.items,
  ]
}

export interface GenerateDayPlanInput {
  meals: readonly MealTarget[]
  /** Alimentos ya filtrados por restricciones, gustos y presupuesto. */
  foods: readonly Food[]
  dayTarget: Macros
  seed: number
}

/**
 * Genera el menú del día: elige alimentos por plantilla de comida, optimiza gramos y
 * hace un ajuste fino a nivel de día para quedar dentro de ±5 % en kcal y macros.
 */
export function generateDayPlan({
  meals,
  foods,
  dayTarget,
  seed,
}: GenerateDayPlanInput): DayMealPlan {
  const foodsById = new Map(foods.map((f) => [f.id, f]))
  const usedProteins = new Set<string>()
  const built = meals.map((meal) => buildMeal(meal, foods, seed + meal.index * 7919, usedProteins))

  const totalsOf = () => mealTotals(built.flatMap(itemsOf), foodsById)
  let deviation = deviationOf(totalsOf(), dayTarget)

  // Ajuste fino: mover porciones de a un paso mientras mejore el error.
  for (let iter = 0; iter < 120 && !isWithinTolerance(deviation); iter++) {
    let best: { v: Variable; delta: number; error: number } | null = null
    for (const meal of built) {
      for (const v of meal.variables) {
        const step = portionStep(v.food, v.grams || 50)
        for (const delta of [step, -step]) {
          const next = v.grams + delta
          if (next < 0 || next > v.hi) continue
          v.grams = next
          const error = errorOf(deviationOf(totalsOf(), dayTarget))
          v.grams -= delta
          if (!best || error < best.error) best = { v, delta, error }
        }
      }
    }
    if (!best || best.error >= errorOf(deviation)) break
    best.v.grams += best.delta
    deviation = deviationOf(totalsOf(), dayTarget)
  }

  const plannedMeals = built.map((b) => ({ ...b.meal, items: itemsOf(b) }))
  const totals = totalsOf()
  return {
    meals: plannedMeals,
    totals,
    target: dayTarget,
    deviation,
    withinTolerance: isWithinTolerance(deviation),
  }
}

/** Recalcula totales y desviación después de editar un plan (p. ej. tras un intercambio). */
export function recomputePlan(
  plan: Pick<DayMealPlan, 'meals' | 'target'>,
  foods: readonly Food[],
): DayMealPlan {
  const foodsById = new Map(foods.map((f) => [f.id, f]))
  const totals = mealTotals(
    plan.meals.flatMap((m) => m.items),
    foodsById,
  )
  const deviation = deviationOf(totals, plan.target)
  return {
    meals: plan.meals,
    target: plan.target,
    totals,
    deviation,
    withinTolerance: isWithinTolerance(deviation),
  }
}
