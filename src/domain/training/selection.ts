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

/**
 * En secundarios y accesorios se prefieren cargas fáciles de ajustar y progresar en pasos pequeños
 * (mancuerna, máquina, polea). Peso corporal y bandas quedan como opción cuando no hay equipo:
 * su carga no se puede subir de forma precisa. En secundarios la barra suma un poco para dar variedad
 * frente al básico del día.
 */
const SECONDARY_LOAD_PENALTY: Record<LoadType, number> = {
  barbell: 6,
  dumbbell: 0,
  stack: 0,
  bodyweight: 12,
  fixed: 16,
}

const ACCESSORY_LOAD_PENALTY: Record<LoadType, number> = {
  stack: 0,
  dumbbell: 1,
  barbell: 3,
  bodyweight: 12,
  fixed: 16,
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
    score += SECONDARY_LOAD_PENALTY[exercise.loadType]
    score += exercise.mainLift ? 8 : 0
  } else {
    score += exercise.kind === 'isolation' ? 0 : 10
    score += ACCESSORY_LOAD_PENALTY[exercise.loadType]
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
