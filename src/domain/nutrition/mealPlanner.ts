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

/** Por encima de esta proteína por comida se combinan dos fuentes (p. ej. pollo + fríjol, huevos + claras). */
const SECOND_PROTEIN_ABOVE = 30
/** Comidas con muchos carbos combinan dos fuentes (p. ej. arroz + plátano). */
const SECOND_CARB_ABOVE = 90

function baseTemplate(meal: MealTarget): Template {
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

export function templateFor(meal: MealTarget): Template {
  const template = baseTemplate(meal)
  const isMainMeal = meal.kind !== 'snack'
  const extra: Template = []
  if (isMainMeal && meal.target.protein > SECOND_PROTEIN_ABOVE) extra.push('protein')
  if (meal.target.carbs > SECOND_CARB_ABOVE) extra.push('carb')
  return [...extra, ...template]
}

export function candidatesFor(foods: readonly Food[], role: MealRole, meal: MealTarget): Food[] {
  const base = foods.filter((f) => f.roles.includes(role) && f.slots.includes(meal.kind))
  if ((meal.isPreWorkout || meal.isPostWorkout) && (role === 'protein' || role === 'carb')) {
    const lean = base.filter((f) => f.per100g.fat <= LOW_FAT_PER_100G)
    if (lean.length > 0) return lean
  }
  return base
}

/**
 * Paso de porción: medio scoop de proteína, unidades enteras pequeñas (huevos) o medias unidades
 * grandes (arepas); el resto, de 5 en 5 g (10 g en porciones grandes).
 */
export function portionStep(food: Food, grams: number): number {
  const scoop = food.measures.find((m) => m.label.startsWith('1 scoop'))
  if (scoop) return scoop.grams / 2
  const unit = food.measures.find((m) => m.label.startsWith('1 unidad'))
  if (unit && unit.grams <= 80) return unit.grams >= 60 ? unit.grams / 2 : unit.grams
  return grams > 150 ? 10 : 5
}

/** Fuente principal de proteína: al menos 10 g por 100 g (las leguminosas y la leche acompañan). */
const PRIMARY_PROTEIN_MIN = 10
/** "Magra": como máximo 0,3 g de grasa por gramo de proteína. */
const LEAN_FAT_PER_PROTEIN = 0.3
/** La grasa de la comida es ajustada si es menor al 40 % de la proteína (en gramos). */
const TIGHT_FAT_RATIO = 0.4

/** Gramos máximos de un alimento en una comida según el tope de su macro principal. */
export function maxGramsFor(food: Food, role: SolvedRole): number {
  const cap = MACRO_CAP[role]
  const density = food.per100g[cap.key] / 100
  return density > 0 ? Math.min(ABSOLUTE_MAX_GRAMS, cap.max / density) : ABSOLUTE_MAX_GRAMS
}

export interface Variable {
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

/**
 * Desviación relativa frente al objetivo. Las kcal se comparan con Atwater (4/4/9) de los macros
 * planificados: así la tolerancia es coherente con los macros aunque cada tabla calcule la energía
 * de los alimentos con factores ligeramente distintos.
 */
function deviationOf(totals: Macros, target: Macros): MacroDeviation {
  const rel = (a: number, t: number) => (t === 0 ? 0 : roundDecimals((a - t) / t, 4))
  const atwater = (m: Macros) => m.protein * 4 + m.carbs * 4 + m.fat * 9
  return {
    kcal: rel(atwater(totals), atwater(target)),
    protein: rel(totals.protein, target.protein),
    carbs: rel(totals.carbs, target.carbs),
    fat: rel(totals.fat, target.fat),
  }
}

/** Error a minimizar: cuadrático y con una penalización fuerte por salirse de la tolerancia. */
function errorOf(d: MacroDeviation): number {
  const tolerance = MEALS.planTolerance * 0.9
  const outside = (x: number) => Math.max(0, Math.abs(x) - tolerance) ** 2
  return (
    IMPORTANCE.kcal * d.kcal ** 2 +
    IMPORTANCE.protein * d.protein ** 2 +
    IMPORTANCE.carbs * d.carbs ** 2 +
    IMPORTANCE.fat * d.fat ** 2 +
    100 * (outside(d.kcal) + outside(d.protein) + outside(d.carbs) + outside(d.fat))
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

  let proteinPicks = 0
  for (const role of templateFor(meal)) {
    const isPrimaryProtein = role === 'protein' && proteinPicks === 0
    const candidates = candidatesFor(foods, role, meal).filter(
      (f) => !variables.some((v) => v.food.id === f.id),
    )
    const dense = candidates.filter((f) => f.per100g.protein >= PRIMARY_PROTEIN_MIN)
    // Con poca grasa disponible en la comida, la proteína principal debe ser magra.
    const lean = dense.filter((f) => f.per100g.fat <= f.per100g.protein * LEAN_FAT_PER_PROTEIN)
    const preferred =
      meal.target.fat < meal.target.protein * TIGHT_FAT_RATIO && lean.length > 0 ? lean : dense
    const all = isPrimaryProtein && preferred.length > 0 ? preferred : candidates
    const fresh = role === 'protein' ? all.filter((f) => !usedProteins.has(f.id)) : all
    const food = pick(fresh.length > 0 ? fresh : all, random)
    if (!food) continue
    if (role === 'protein') {
      usedProteins.add(food.id)
      proteinPicks++
    }
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

interface Move {
  v: Variable
  delta: number
}

function shifted(totals: Macros, moves: readonly Move[]): Macros {
  const next = { ...totals }
  for (const { v, delta } of moves) {
    for (const key of ['kcal', ...MACRO_KEYS] as const)
      next[key] += (v.food.per100g[key] * delta) / 100
  }
  return next
}

function candidateMoves(variables: readonly Variable[]): Move[] {
  return variables.flatMap((v) => {
    const step = portionStep(v.food, v.grams || 50)
    return [step, -step]
      .filter((delta) => v.grams + delta >= 0 && v.grams + delta <= v.hi)
      .map((delta) => ({ v, delta }))
  })
}

/**
 * Ajuste fino del día: mueve porciones de a un paso (o dos a la vez si un solo cambio no mejora)
 * mientras el error baje, hasta quedar dentro de la tolerancia.
 */
export function fineTune(variables: readonly Variable[], start: Macros, target: Macros): void {
  let totals = start
  let error = errorOf(deviationOf(totals, target))
  for (let iter = 0; iter < 150 && !isWithinTolerance(deviationOf(totals, target)); iter++) {
    const singles = candidateMoves(variables)
    let best: { moves: Move[]; error: number } | null = null
    for (const move of singles) {
      const e = errorOf(deviationOf(shifted(totals, [move]), target))
      if (!best || e < best.error) best = { moves: [move], error: e }
    }
    if (!best || best.error >= error) {
      for (let i = 0; i < singles.length; i++) {
        for (let j = i + 1; j < singles.length; j++) {
          const a = singles[i] as Move
          const b = singles[j] as Move
          if (a.v === b.v) continue
          const e = errorOf(deviationOf(shifted(totals, [a, b]), target))
          if (!best || e < best.error) best = { moves: [a, b], error: e }
        }
      }
    }
    if (!best || best.error >= error) return
    for (const { v, delta } of best.moves) v.grams += delta
    totals = shifted(totals, best.moves)
    error = best.error
  }
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
function attempt({ meals, foods, dayTarget, seed }: GenerateDayPlanInput): DayMealPlan {
  const foodsById = new Map(foods.map((f) => [f.id, f]))
  const usedProteins = new Set<string>()
  const built = meals.map((meal) => buildMeal(meal, foods, seed + meal.index * 7919, usedProteins))

  const totalsOf = () => mealTotals(built.flatMap(itemsOf), foodsById)
  fineTune(
    built.flatMap((b) => b.variables),
    totalsOf(),
    dayTarget,
  )

  const plannedMeals = built.map((b) => ({ ...b.meal, items: itemsOf(b) }))
  const totals = totalsOf()
  const deviation = deviationOf(totals, dayTarget)
  return {
    meals: plannedMeals,
    totals,
    target: dayTarget,
    deviation,
    withinTolerance: isWithinTolerance(deviation),
  }
}

const MAX_ATTEMPTS = 4

/**
 * Genera el menú del día. Si una combinación de alimentos no permite llegar a ±5 %,
 * prueba otras combinaciones (deterministas) y se queda con la mejor.
 */
export function generateDayPlan(input: GenerateDayPlanInput): DayMealPlan {
  let best: DayMealPlan | null = null
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const plan = attempt({ ...input, seed: input.seed + i * 104729 })
    if (plan.withinTolerance) return plan
    if (!best || errorOf(plan.deviation) < errorOf(best.deviation)) best = plan
  }
  return best as DayMealPlan
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
