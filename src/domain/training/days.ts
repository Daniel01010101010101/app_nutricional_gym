import { TRAINING_DAYS } from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import type { ExperienceLevel, Weekday } from '../types'

export interface DaysRecommendation {
  recommended: number
  maxAllowed: number
  warning?: string
}

/** Cuántos días entrenar: mínimo efectivo 3, ideal 4, máximo 5 en déficit (6 solo avanzados). */
export function recommendTrainingDays(
  availableDays: number,
  experience: ExperienceLevel,
): Calculated<DaysRecommendation> {
  const cap = experience === 'advanced' ? TRAINING_DAYS.maxInDeficit : TRAINING_DAYS.idealRecomp
  const absoluteMax =
    experience === 'advanced' ? TRAINING_DAYS.maxAdvanced : TRAINING_DAYS.maxInDeficit
  const recommended = Math.max(1, Math.min(availableDays, cap))
  const maxAllowed = Math.max(1, Math.min(availableDays, absoluteMax))
  const warning =
    availableDays < TRAINING_DAYS.minimumEffective
      ? 'Con menos de 3 días por semana se puede mantener la fuerza, pero el progreso es más lento. Si puedes, suma un día.'
      : undefined

  return calculated(
    { recommended, maxAllowed, ...(warning ? { warning } : {}) },
    {
      title: 'Días de entrenamiento',
      summary: `Te recomendamos ${recommended} días por semana.`,
      steps: [
        { label: 'Días disponibles', value: String(availableDays) },
        { label: 'Mínimo efectivo', value: '3 días' },
        { label: 'Ideal para recomposición', value: '4 días' },
        {
          label: 'Máximo en déficit',
          value: experience === 'advanced' ? '5 días (6 si eres avanzado)' : '5 días',
        },
      ],
      rationale:
        'En déficit la recuperación es limitada. 4 días permiten entrenar cada músculo 2 veces por semana con buena calidad; más días suman fatiga sin mucho beneficio extra.',
    },
  )
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]]
  return items.flatMap((item, i) =>
    combinations(items.slice(i + 1), k - 1).map((rest) => [item, ...rest]),
  )
}

/** Puntaje de distribución: penaliza huecos desiguales y 3+ días seguidos. Menor es mejor. */
export function scheduleScore(days: readonly Weekday[]): number {
  const n = days.length
  const ideal = 7 / n
  let score = 0
  for (let i = 0; i < n; i++) {
    const current = days[i] as number
    const next = i === n - 1 ? (days[0] as number) + 7 : (days[i + 1] as number)
    score += (next - current - ideal) ** 2
  }
  const set = new Set(days)
  for (const d of days) {
    if (set.has(((d % 7) + 1) as Weekday) && set.has((((d + 1) % 7) + 1) as Weekday)) score += 4
  }
  return score
}

/** Elige qué días entrenar entre los disponibles para repartir la carga lo mejor posible. */
export function assignWeekdays(available: readonly Weekday[], count: number): Weekday[] {
  const sorted = [...new Set(available)].sort((a, b) => a - b)
  const k = Math.min(count, sorted.length)
  if (k === 0) return []
  const options = combinations(sorted, k)
  let best = options[0] as Weekday[]
  let bestScore = scheduleScore(best)
  for (const option of options.slice(1)) {
    const score = scheduleScore(option)
    if (score < bestScore) {
      best = option
      bestScore = score
    }
  }
  return best
}

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
}
