import { similarity } from '../shared/text'
import type { Exercise } from '../types'

export interface ExerciseMatch {
  exercise: Exercise
  score: number
}

export const MATCH_THRESHOLD = 0.6

/** Busca el ejercicio que mejor coincide con un texto libre (nombre, inglés o alias). */
export function matchExercise(
  query: string,
  exercises: readonly Exercise[],
): { best: ExerciseMatch | null; suggestions: ExerciseMatch[] } {
  const scored = exercises
    .map((exercise) => {
      const names = [exercise.name, exercise.nameEn, ...exercise.aliases]
      const score = Math.max(...names.map((n) => similarity(query, n)))
      return { exercise, score }
    })
    .sort(
      (a, b) => b.score - a.score || (b.exercise.mainLift ? 1 : 0) - (a.exercise.mainLift ? 1 : 0),
    )

  const top = scored[0]
  return {
    best: top && top.score >= MATCH_THRESHOLD ? top : null,
    suggestions: scored.filter((s) => s.score >= 0.35).slice(0, 3),
  }
}
