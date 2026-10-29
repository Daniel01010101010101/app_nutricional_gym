import { fmt } from '../shared/format'
import { roundTo } from '../shared/math'
import type { Food, Macros } from '../types'

export type GapStatus = 'empty' | 'protein-gap' | 'kcal-gap' | 'over' | 'done'

export interface GapMessage {
  status: GapStatus
  title: string
  detail: string
  ideas: string[]
  remaining: Macros
}

const PROTEIN_GAP_MIN = 10
const KCAL_GAP_MIN = 150
const DONE_TOLERANCE = 0.05

export function remainingMacros(target: Macros, consumed: Macros): Macros {
  return {
    kcal: Math.round(target.kcal - consumed.kcal),
    protein: Math.round(target.protein - consumed.protein),
    carbs: Math.round(target.carbs - consumed.carbs),
    fat: Math.round(target.fat - consumed.fat),
  }
}

const COUNTABLE_MEASURES = /^1 (unidad|scoop|rebanada|tajada|taza|cucharada|vaso|lata|porción)/

function pluralize(word: string): string {
  return /[aeiou]$/.test(word) ? `${word}s` : `${word}es`
}

/** Expresa gramos en una medida casera contable si queda cerca de un número de unidades; si no, en gramos. */
export function describePortion(food: Food, grams: number): string {
  for (const measure of food.measures) {
    if (!COUNTABLE_MEASURES.test(measure.label)) continue
    const count = grams / measure.grams
    const rounded = Math.round(count * 2) / 2
    if (rounded >= 0.5 && rounded <= 6 && Math.abs(count - rounded) / count <= 0.2) {
      const [unit = '', ...rest] = measure.label.replace(/^1 /, '').split(' ')
      const label = [rounded > 1 ? pluralize(unit) : unit, ...rest].join(' ')
      return `${fmt(rounded, 1)} ${label} de ${food.name.toLowerCase()}`
    }
  }
  return `${roundTo(grams, 10)} g de ${food.name.toLowerCase()}`
}

/** Fuentes de proteína densas: ≥ 15 g/100 g y ≥ 50 % de las kcal desde proteína. */
export function leanProteinSources(foods: readonly Food[]): Food[] {
  return foods
    .filter((f) => {
      const { protein, kcal } = f.per100g
      return protein >= 15 && kcal > 0 && (protein * 4) / kcal >= 0.5
    })
    .sort((a, b) => b.per100g.protein / b.per100g.kcal - a.per100g.protein / a.per100g.kcal)
}

function proteinIdeas(gap: number, foods: readonly Food[]): string[] {
  const sources = leanProteinSources(foods)
  const ideas = sources.slice(0, 2).map((f) => describePortion(f, (gap / f.per100g.protein) * 100))

  const whey = sources.find((f) => f.category === 'supplement')
  const scoop = whey?.measures.find((m) => m.label.startsWith('1 scoop'))
  const egg = foods.find(
    (f) => f.category === 'egg' && f.measures.some((m) => m.label.startsWith('1 unidad')),
  )
  const eggUnit = egg?.measures.find((m) => m.label.startsWith('1 unidad'))
  if (whey && scoop && egg && eggUnit && gap > 30) {
    const fromWhey = (whey.per100g.protein * scoop.grams) / 100
    const eggs = Math.max(
      1,
      Math.round((gap - fromWhey) / ((egg.per100g.protein * eggUnit.grams) / 100)),
    )
    ideas.push(`1 scoop de ${whey.name.toLowerCase()} + ${eggs} ${eggs === 1 ? 'huevo' : 'huevos'}`)
  }
  return ideas
}

function kcalIdeas(remaining: Macros, foods: readonly Food[]): string[] {
  const carbSources = foods.filter((f) => f.roles.includes('carb') && f.per100g.fat < 5)
  const fatSources = foods.filter((f) => f.roles.includes('fat'))
  const ideas: string[] = []
  const carb = carbSources[0]
  if (carb && remaining.carbs > 15)
    ideas.push(describePortion(carb, (remaining.carbs / carb.per100g.carbs) * 100))
  const fat = fatSources[0]
  if (fat && remaining.fat > 5)
    ideas.push(describePortion(fat, (remaining.fat / fat.per100g.fat) * 100))
  return ideas
}

/** Mensaje de coach sobre lo que falta del día, con ideas concretas. */
export function nutritionGapMessage(
  target: Macros,
  consumed: Macros,
  foods: readonly Food[],
): GapMessage {
  const remaining = remainingMacros(target, consumed)

  if (consumed.kcal === 0) {
    return {
      status: 'empty',
      title: 'Aún no registras comidas hoy',
      detail: `Tu objetivo: ${fmt(target.kcal)} kcal y ${fmt(target.protein)} g de proteína. Empieza con un desayuno alto en proteína.`,
      ideas: [],
      remaining,
    }
  }

  if (remaining.kcal < -target.kcal * DONE_TOLERANCE) {
    return {
      status: 'over',
      title: `Te pasaste ${fmt(-remaining.kcal)} kcal`,
      detail:
        remaining.protein > PROTEIN_GAP_MIN
          ? `Aún te faltan ${fmt(remaining.protein)} g de proteína: prioriza fuentes magras. Un día no cambia el resultado; la semana sí.`
          : 'Un día no cambia el resultado: lo que cuenta es el promedio semanal. Mañana sigues el plan.',
      ideas:
        remaining.protein > PROTEIN_GAP_MIN
          ? proteinIdeas(remaining.protein, foods).slice(0, 1)
          : [],
      remaining,
    }
  }

  if (remaining.protein >= PROTEIN_GAP_MIN) {
    return {
      status: 'protein-gap',
      title: `Te faltan ${fmt(remaining.protein)} g de proteína`,
      detail: `Y te quedan ${fmt(Math.max(0, remaining.kcal))} kcal para el resto del día.`,
      ideas: proteinIdeas(remaining.protein, foods),
      remaining,
    }
  }

  if (remaining.kcal >= KCAL_GAP_MIN) {
    return {
      status: 'kcal-gap',
      title: `Proteína cumplida. Te quedan ${fmt(remaining.kcal)} kcal`,
      detail: 'Complétalas con carbohidratos alrededor del entreno y algo de grasa saludable.',
      ideas: kcalIdeas(remaining, foods),
      remaining,
    }
  }

  return {
    status: 'done',
    title: '¡Día redondo!',
    detail: 'Cumpliste tus calorías y tu proteína. Así es como se forja el progreso.',
    ideas: [],
    remaining,
  }
}
