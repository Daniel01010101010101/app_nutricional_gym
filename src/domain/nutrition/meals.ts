import { KCAL_PER_GRAM, MEALS, ROUNDING } from '../constants/formulas'
import { minutesToTime, timeToMinutes } from '../shared/dates'
import { roundTo, sum } from '../shared/math'
import type { Macros, MealSlotKind } from '../types'

export type MealsPerDay = 3 | 4 | 5 | 6

export interface MealSlot {
  index: number
  name: string
  time: string
  kind: MealSlotKind
  isPreWorkout: boolean
  isPostWorkout: boolean
}

interface SlotTemplate {
  name: string
  time: string
  kind: MealSlotKind
}

/** Horarios típicos en Colombia y Latinoamérica. */
const SCHEDULES: Record<MealsPerDay, SlotTemplate[]> = {
  3: [
    { name: 'Desayuno', time: '07:00', kind: 'breakfast' },
    { name: 'Almuerzo', time: '13:00', kind: 'lunch' },
    { name: 'Cena', time: '19:30', kind: 'dinner' },
  ],
  4: [
    { name: 'Desayuno', time: '07:00', kind: 'breakfast' },
    { name: 'Almuerzo', time: '12:30', kind: 'lunch' },
    { name: 'Onces', time: '16:30', kind: 'snack' },
    { name: 'Cena', time: '20:00', kind: 'dinner' },
  ],
  5: [
    { name: 'Desayuno', time: '07:00', kind: 'breakfast' },
    { name: 'Media mañana', time: '10:00', kind: 'snack' },
    { name: 'Almuerzo', time: '13:00', kind: 'lunch' },
    { name: 'Onces', time: '16:30', kind: 'snack' },
    { name: 'Cena', time: '20:00', kind: 'dinner' },
  ],
  6: [
    { name: 'Desayuno', time: '06:30', kind: 'breakfast' },
    { name: 'Media mañana', time: '09:30', kind: 'snack' },
    { name: 'Almuerzo', time: '12:30', kind: 'lunch' },
    { name: 'Onces', time: '15:30', kind: 'snack' },
    { name: 'Cena', time: '18:30', kind: 'dinner' },
    { name: 'Merienda', time: '21:00', kind: 'snack' },
  ],
}

const MIN_GAP_MINUTES = 120

/**
 * Construye las comidas del día y marca pre y post-entreno.
 * Si ninguna comida cae 1–3 h antes del entreno, se mueve un snack a 90 min antes
 * (siempre que quede a 2 h o más de la comida anterior).
 */
export function buildMealSlots(
  mealsPerDay: MealsPerDay,
  trainingTime: string | null,
  sessionMinutes = 60,
): MealSlot[] {
  const slots: MealSlot[] = SCHEDULES[mealsPerDay].map((t, index) => ({
    ...t,
    index,
    isPreWorkout: false,
    isPostWorkout: false,
  }))
  if (trainingTime === null) return slots

  const start = timeToMinutes(trainingTime)
  const end = start + sessionMinutes
  const [minBefore, maxBefore] = MEALS.preWorkoutWindowHours.map((h) => h * 60) as [number, number]
  const minutes = (slot: MealSlot) => timeToMinutes(slot.time)

  // Pre-entreno
  let pre = [...slots]
    .reverse()
    .find((s) => start - minutes(s) >= minBefore && start - minutes(s) <= maxBefore)
  if (!pre) {
    const target = start - 90
    const candidates = slots.filter((s, i) => {
      if (s.kind !== 'snack' || minutes(s) >= end) return false
      const previous = slots[i - 1]
      return !previous || target - minutes(previous) >= MIN_GAP_MINUTES
    })
    const closest = candidates.sort(
      (a, b) => Math.abs(minutes(a) - target) - Math.abs(minutes(b) - target),
    )[0]
    if (closest) {
      closest.time = minutesToTime(target)
      pre = closest
    }
  }
  if (pre) pre.isPreWorkout = true

  // Post-entreno: la primera comida después de terminar. Si ninguna queda después,
  // la última comida (si cae durante el entreno) se mueve a 30 min después de terminar.
  let post = slots
    .filter((s) => !s.isPreWorkout && minutes(s) >= end)
    .sort((a, b) => minutes(a) - minutes(b))[0]
  if (!post) {
    const last = slots.filter((s) => !s.isPreWorkout && minutes(s) >= start - 60).at(-1)
    if (last && end + 30 < 24 * 60) {
      last.time = minutesToTime(end + 30)
      post = last
    }
  }
  if (post) post.isPostWorkout = true

  return slots.sort((a, b) => minutes(a) - minutes(b)).map((s, index) => ({ ...s, index }))
}

export interface MealTarget extends MealSlot {
  target: Macros
}

function weightFor(slot: MealSlot): number {
  return slot.kind === 'snack' ? 0.6 : 1
}

/**
 * Reparte gramos según pesos y los acota a [min, max] por comida, redistribuyendo el sobrante.
 * Si la restricción es imposible (p. ej. mucha proteína en pocas comidas) se reparte proporcional.
 */
export function distributeWithBounds(
  total: number,
  weights: readonly number[],
  min: number,
  max: number,
): number[] {
  const n = weights.length
  if (total > max * n || total < min * n) {
    const totalWeight = sum(weights)
    return weights.map((w) => (total * w) / totalWeight)
  }
  const result = new Array<number>(n).fill(0)
  const fixed = new Array<boolean>(n).fill(false)
  let remaining = total
  for (let iter = 0; iter < n; iter++) {
    const freeWeight = sum(weights.filter((_, i) => !fixed[i]))
    let changed = false
    for (let i = 0; i < n; i++) {
      if (fixed[i]) continue
      result[i] = (remaining * (weights[i] as number)) / freeWeight
    }
    for (let i = 0; i < n; i++) {
      if (fixed[i]) continue
      const value = result[i] as number
      if (value > max || value < min) {
        result[i] = value > max ? max : min
        fixed[i] = true
        remaining -= result[i] as number
        changed = true
      }
    }
    if (!changed) break
  }
  return result
}

/** Redondea a múltiplos de `step` conservando la suma (método del mayor residuo). */
export function roundPreservingTotal(values: readonly number[], step: number): number[] {
  const total = roundTo(sum(values), step)
  const floors = values.map((v) => Math.floor(v / step + 1e-9) * step)
  let missing = Math.round((total - sum(floors)) / step)
  const order = values
    .map((v, i) => ({ i, remainder: v - (floors[i] as number) }))
    .sort((a, b) => b.remainder - a.remainder)
  const result = [...floors]
  for (const { i } of order) {
    if (missing <= 0) break
    result[i] = (result[i] as number) + step
    missing--
  }
  return result
}

/** Reparte los macros del día entre las comidas (la suma de las comidas = objetivo del día). */
export function distributeMacros(
  slots: readonly MealSlot[],
  day: Omit<Macros, 'kcal'>,
): MealTarget[] {
  const [minProtein, maxProtein] = MEALS.proteinPerMeal
  const protein = roundPreservingTotal(
    distributeWithBounds(day.protein, slots.map(weightFor), minProtein, maxProtein),
    ROUNDING.macroGrams,
  )

  const carbWeights = slots.map((s) => weightFor(s) * (s.isPreWorkout || s.isPostWorkout ? 1.5 : 1))
  const fatWeights = slots.map((s) => weightFor(s) * (s.isPreWorkout || s.isPostWorkout ? 0.5 : 1))
  const carbTotal = sum(carbWeights)
  const fatTotal = sum(fatWeights)
  const carbs = roundPreservingTotal(
    carbWeights.map((w) => (day.carbs * w) / carbTotal),
    ROUNDING.macroGrams,
  )
  const fat = roundPreservingTotal(
    fatWeights.map((w) => (day.fat * w) / fatTotal),
    ROUNDING.macroGrams,
  )

  return slots.map((slot, i) => {
    const target = {
      protein: protein[i] as number,
      carbs: carbs[i] as number,
      fat: fat[i] as number,
    }
    const kcal =
      target.protein * KCAL_PER_GRAM.protein +
      target.carbs * KCAL_PER_GRAM.carbs +
      target.fat * KCAL_PER_GRAM.fat
    return { ...slot, target: { kcal, ...target } }
  })
}
