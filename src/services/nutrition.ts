import { targetsForDay, type DayTargets } from '@/domain/nutrition/dayTarget'
import { fitsBudget, isFoodAllowed, nutrientsFor, sumNutrients } from '@/domain/nutrition/foods'
import { generateDayPlan, recomputePlan, type DayMealPlan } from '@/domain/nutrition/mealPlanner'
import {
  buildMealSlots,
  distributeMacros,
  type MealSlot,
  type MealTarget,
} from '@/domain/nutrition/meals'
import { weeklyFoodPool } from '@/domain/nutrition/rotation'
import type { Calculated, Explanation } from '@/domain/shared/explanation'
import { fmt } from '@/domain/shared/format'
import { addDaysToKey, startOfWeekKey } from '@/domain/shared/dates'
import { hashString, roundDecimals } from '@/domain/shared/math'
import type { DayKey, Food, Nutrients } from '@/domain/types'
import { newId, nowIso } from '@/data/defaults'
import type { Repositories } from '@/data/repositories/types'
import type {
  FavoriteMeal,
  FoodLogEntry,
  MealPlanRecord,
  NutritionTargets,
  Profile,
  TrainingPlan,
  WorkoutSession,
} from '@/data/schemas'

import { foodPreferencesOf } from './profile'
import { planDayFor } from './workout'

/* ───────────────────────────── Tipo de día y objetivos ───────────────────────────── */

/** Día de entreno: el plan tiene sesión ese día de la semana o ya entrenaste esa fecha. */
export function isTrainingDayFor(
  plan: TrainingPlan | undefined,
  sessions: readonly WorkoutSession[],
  date: DayKey,
): boolean {
  return sessions.some((s) => s.date === date) || planDayFor(plan, date) !== undefined
}

export function dayTargetsFor(
  targets: NutritionTargets,
  isTrainingDay: boolean,
): Calculated<DayTargets> {
  return targetsForDay(targets, isTrainingDay)
}

export function mealSlotsFor(profile: Profile, isTrainingDay: boolean): MealSlot[] {
  return buildMealSlots(
    profile.nutrition.mealsPerDay,
    isTrainingDay ? profile.nutrition.trainingTime : null,
    profile.sessionMinutes,
  )
}

export function mealTargetsFor(profile: Profile, day: DayTargets): MealTarget[] {
  return distributeMacros(mealSlotsFor(profile, day.isTrainingDay), {
    protein: day.protein,
    carbs: day.carbs,
    fat: day.fat,
  })
}

/** Alimentos que el generador puede usar: respeta restricciones, alergias, gustos y presupuesto. */
export function plannerFoods(foods: readonly Food[], profile: Profile): Food[] {
  const prefs = foodPreferencesOf(profile)
  return foods.filter((f) => isFoodAllowed(f, prefs) && fitsBudget(f, prefs.budget))
}

/* ───────────────────────────── Plan de comidas ───────────────────────────── */

export function seedFor(date: DayKey, variant = 0): number {
  return (hashString(date) + variant * 7919) % 2147483647
}

const maxDeviation = (plan: DayMealPlan) => Math.max(...Object.values(plan.deviation).map(Math.abs))

export function generatePlanRecord(input: {
  profile: Profile
  targets: NutritionTargets
  foods: readonly Food[]
  date: DayKey
  isTrainingDay: boolean
  seed: number
}): MealPlanRecord {
  const day = dayTargetsFor(input.targets, input.isTrainingDay).value
  const dayTarget = { kcal: day.kcal, protein: day.protein, carbs: day.carbs, fat: day.fat }
  const meals = mealTargetsFor(input.profile, day)
  const allowed = plannerFoods(input.foods, input.profile)
  // Primero con los alimentos de la semana (lista de mercado corta); si no cuadra, con todo el catálogo.
  const pool = weeklyFoodPool(allowed, seedFor(startOfWeekKey(input.date)))
  let plan = generateDayPlan({ meals, foods: pool, dayTarget, seed: input.seed })
  if (!plan.withinTolerance) {
    const fallback = generateDayPlan({ meals, foods: allowed, dayTarget, seed: input.seed })
    if (maxDeviation(fallback) < maxDeviation(plan)) plan = fallback
  }
  return {
    date: input.date,
    seed: input.seed,
    target: dayTarget,
    meals: plan.meals.map((m) => ({
      index: m.index,
      name: m.name,
      time: m.time,
      kind: m.kind,
      isPreWorkout: m.isPreWorkout,
      isPostWorkout: m.isPostWorkout,
      target: m.target,
      items: m.items,
    })),
    generatedAt: nowIso(),
  }
}

export function planFromRecord(record: MealPlanRecord, foods: readonly Food[]): DayMealPlan {
  return recomputePlan({ meals: record.meals, target: record.target }, foods)
}

const pct = (x: number) => `${x > 0 ? '+' : ''}${fmt(x * 100, 1)} %`

/** Explicación del menú generado: cómo se arma y cuánto se desvía del objetivo. */
export function planExplanation(plan: DayMealPlan): Explanation {
  const { totals, target, deviation } = plan
  return {
    title: 'Cómo se arma tu menú',
    summary: `Tus macros del día se reparten entre ${plan.meals.length} comidas (más carbos alrededor del entreno). Se eligen alimentos que respetan tus restricciones, alergias, gustos y presupuesto, y se ajustan los gramos para quedar dentro de ±5 % en calorías y en cada macro.`,
    steps: [
      {
        label: 'Objetivo',
        value: `${fmt(target.kcal)} kcal · P ${target.protein} · C ${target.carbs} · G ${target.fat} g`,
      },
      {
        label: 'Menú',
        value: `${fmt(totals.kcal)} kcal · P ${fmt(totals.protein)} · C ${fmt(totals.carbs)} · G ${fmt(totals.fat)} g`,
      },
      {
        label: 'Desvío',
        value: `kcal ${pct(deviation.kcal)} · P ${pct(deviation.protein)} · C ${pct(deviation.carbs)} · G ${pct(deviation.fat)}`,
      },
    ],
    rationale:
      'Las porciones se redondean a medidas reales (unidades, medio scoop, múltiplos de 5–10 g), por eso nunca es exacto al gramo. Los intercambios conservan el macro principal del alimento.',
  }
}

/** Reemplaza un alimento del plan por un equivalente (intercambio). */
export function swapPlanItem(
  record: MealPlanRecord,
  mealIndex: number,
  itemIndex: number,
  replacement: { foodId: string; grams: number },
): MealPlanRecord {
  return {
    ...record,
    meals: record.meals.map((meal) =>
      meal.index !== mealIndex
        ? meal
        : {
            ...meal,
            items: meal.items.map((item, i) =>
              i === itemIndex ? { ...item, ...replacement } : item,
            ),
          },
    ),
  }
}

/** Asegura un plan guardado para cada fecha (genera los que falten) y los devuelve en orden. */
export async function ensureMealPlans(
  repos: Repositories,
  input: {
    profile: Profile
    foods: readonly Food[]
    dates: readonly DayKey[]
    isTrainingDay: (date: DayKey) => boolean
  },
): Promise<MealPlanRecord[]> {
  const [first, last] = [input.dates[0], input.dates.at(-1)]
  if (!first || !last) return []
  const existing = new Map((await repos.mealPlans.listRange(first, last)).map((p) => [p.date, p]))
  const created: MealPlanRecord[] = []
  for (const date of input.dates) {
    if (existing.has(date)) continue
    const targets = await repos.targets.getFor(date)
    if (!targets) continue
    const record = generatePlanRecord({
      profile: input.profile,
      targets,
      foods: input.foods,
      date,
      isTrainingDay: input.isTrainingDay(date),
      seed: seedFor(date),
    })
    created.push(record)
    existing.set(date, record)
  }
  if (created.length > 0) await repos.mealPlans.saveMany(created)
  return input.dates.flatMap((d) => {
    const plan = existing.get(d)
    return plan ? [plan] : []
  })
}

/* ───────────────────────────── Diario ───────────────────────────── */

export function entryFromFood(input: {
  food: Food
  grams: number
  date: DayKey
  mealIndex: number
  measure?: { label: string; quantity: number }
}): FoodLogEntry {
  const n = nutrientsFor(input.food, input.grams)
  const now = nowIso()
  return {
    id: newId(),
    date: input.date,
    mealIndex: input.mealIndex,
    kind: 'food',
    foodId: input.food.id,
    name: input.food.name,
    grams: roundDecimals(input.grams, 1),
    measureLabel: input.measure?.label ?? null,
    quantity: input.measure?.quantity ?? null,
    ...n,
    createdAt: now,
    updatedAt: now,
  }
}

/** Registro rápido de macros (comida fuera de casa, etiqueta nutricional…). */
export function quickEntry(input: {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  date: DayKey
  mealIndex: number
}): FoodLogEntry {
  const now = nowIso()
  return {
    id: newId(),
    date: input.date,
    mealIndex: input.mealIndex,
    kind: 'quick',
    foodId: null,
    name: input.name.trim() || 'Registro rápido',
    grams: null,
    measureLabel: null,
    quantity: null,
    kcal: Math.round(input.kcal),
    protein: roundDecimals(input.protein, 1),
    carbs: roundDecimals(input.carbs, 1),
    fat: roundDecimals(input.fat, 1),
    fiber: 0,
    createdAt: now,
    updatedAt: now,
  }
}

/** kcal a partir de macros (Atwater) para el registro rápido. */
export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9)
}

export function entriesFromPlanMeal(
  meal: MealPlanRecord['meals'][number],
  foodsById: ReadonlyMap<string, Food>,
  date: DayKey,
): FoodLogEntry[] {
  return meal.items.flatMap((item) => {
    const food = foodsById.get(item.foodId)
    return food ? [entryFromFood({ food, grams: item.grams, date, mealIndex: meal.index })] : []
  })
}

/** Copia registros (p. ej. de ayer) a otra fecha con ids nuevos. */
export function copyEntries(
  entries: readonly FoodLogEntry[],
  date: DayKey,
  mealIndex?: number,
): FoodLogEntry[] {
  const now = nowIso()
  return entries.map((e) => ({
    ...e,
    id: newId(),
    date,
    mealIndex: mealIndex ?? e.mealIndex,
    createdAt: now,
    updatedAt: now,
  }))
}

/** Cambia los gramos de un registro y recalcula sus nutrientes. */
export function rescaleEntry(food: Food, grams: number): Partial<FoodLogEntry> {
  return {
    grams: roundDecimals(grams, 1),
    measureLabel: null,
    quantity: null,
    ...nutrientsFor(food, grams),
    updatedAt: nowIso(),
  }
}

export function totalsOf(
  entries: readonly Pick<FoodLogEntry, 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'>[],
): Nutrients {
  return sumNutrients(
    entries.map(({ kcal, protein, carbs, fat, fiber }) => ({ kcal, protein, carbs, fat, fiber })),
  )
}

export function favoriteFromEntries(name: string, entries: readonly FoodLogEntry[]): FavoriteMeal {
  const now = nowIso()
  return {
    id: newId(),
    name: name.trim().slice(0, 60),
    items: entries.map((e) => ({
      foodId: e.foodId,
      name: e.name,
      grams: e.grams,
      measureLabel: e.measureLabel,
      quantity: e.quantity,
      kcal: e.kcal,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
      fiber: e.fiber,
    })),
    createdAt: now,
    updatedAt: now,
  }
}

export function entriesFromFavorite(
  favorite: FavoriteMeal,
  date: DayKey,
  mealIndex: number,
): FoodLogEntry[] {
  const now = nowIso()
  return favorite.items.map((item) => ({
    ...item,
    id: newId(),
    date,
    mealIndex,
    kind: item.foodId ? 'food' : 'quick',
    createdAt: now,
    updatedAt: now,
  }))
}

/** Alimentos más registrados en los últimos 30 días (para tenerlos a un toque). */
export async function recentFoodIds(
  repos: Repositories,
  today: DayKey,
  limit = 12,
): Promise<string[]> {
  const entries = await repos.foodLogs.listRange(addDaysToKey(today, -30), today)
  const counts = new Map<string, number>()
  for (const e of entries) if (e.foodId) counts.set(e.foodId, (counts.get(e.foodId) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}
