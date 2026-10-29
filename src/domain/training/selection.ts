import type { Equipment, Exercise, Joint, LoadType } from '../types'
import type { SlotTemplate } from './splits'

export type EquipmentPreset = 'gym' | 'home' | 'dumbbells'

export const EQUIPMENT_PRESETS: Record<EquipmentPreset, Equipment[]> = {
  gym: [
    'barbell',
    'rack',
    'bench',
    'dumbbell',
    'machine',
    'cable',
    'pullup-bar',
    'kettlebell',
    'band',
    'ez-bar',
    'trap-bar',
    'smith',
    'bodyweight',
  ],
  home: ['bodyweight', 'band', 'pullup-bar'],
  dumbbells: ['bodyweight', 'dumbbell', 'bench'],
}

export interface SelectionContext {
  equipment: readonly Equipment[]
  injuries: readonly Joint[]
  excludedIds: readonly string[]
  /** Ejercicios preferidos (p. ej. jalón en lugar de dominadas si así hiciste el test inicial). */
  preferredIds?: readonly string[]
}

export function isExerciseAvailable(exercise: Exercise, ctx: SelectionContext): boolean {
  return (
    exercise.equipment.every((e) => e === 'bodyweight' || ctx.equipment.includes(e)) &&
    !exercise.stresses.some((j) => ctx.injuries.includes(j)) &&
    !ctx.excludedIds.includes(exercise.id)
  )
}

const LOAD_PREFERENCE: Record<LoadType, number> = {
  barbell: 0,
  dumbbell: 1,
  stack: 2,
  bodyweight: 2,
  fixed: 3,
}

/** Puntaje (menor = mejor) de un ejercicio para un hueco del plan. */
export function slotScore(
  exercise: Exercise,
  slot: SlotTemplate,
  patternIndex: number,
  weekUsed: ReadonlySet<string>,
  preferredIds: readonly string[] = [],
): number {
  let score = patternIndex * 100
  if (preferredIds.includes(exercise.id)) score -= 60
  if (slot.mainLift && exercise.mainLift === slot.mainLift) score -= 50
  if (slot.role === 'main') {
    score += exercise.kind === 'compound' ? 0 : 40
    score += LOAD_PREFERENCE[exercise.loadType] * 5
  } else if (slot.role === 'secondary') {
    score += exercise.kind === 'compound' ? 0 : 30
    // Variedad: en secundarios preferimos mancuerna o máquina sobre barra.
    score += exercise.loadType === 'barbell' ? 6 : 0
    score += exercise.mainLift ? 8 : 0
  } else {
    score += exercise.kind === 'isolation' ? 0 : 10
    if (slot.muscle && exercise.primaryMuscle !== slot.muscle) score += 20
  }
  if (weekUsed.has(exercise.id)) score += 15
  return score
}

/**
 * Elige el mejor ejercicio disponible para un hueco del plan.
 * Respeta equipo, lesiones, exclusiones y evita repetir dentro de la misma sesión.
 */
export function selectExercise(
  slot: SlotTemplate,
  exercises: readonly Exercise[],
  ctx: SelectionContext,
  sessionUsed: ReadonlySet<string>,
  weekUsed: ReadonlySet<string>,
): Exercise | null {
  let best: { exercise: Exercise; score: number; order: number } | null = null
  exercises.forEach((exercise, order) => {
    if (sessionUsed.has(exercise.id) || !isExerciseAvailable(exercise, ctx)) return
    const patternIndex = slot.patterns.indexOf(exercise.pattern)
    if (patternIndex === -1) return
    const score = slotScore(exercise, slot, patternIndex, weekUsed, ctx.preferredIds)
    if (!best || score < best.score || (score === best.score && order < best.order)) {
      best = { exercise, score, order }
    }
  })
  return (best as { exercise: Exercise } | null)?.exercise ?? null
}
