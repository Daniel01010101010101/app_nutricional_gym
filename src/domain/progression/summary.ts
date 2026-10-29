import { roundDecimals } from '../shared/math'
import { TRACKED_MUSCLES, type Exercise, type Muscle, type WorkoutSet } from '../types'
import { bestE1rm, isWorkingSet } from './e1rm'
import { detectRecords, type PersonalRecord } from './records'

export interface E1rmChange {
  exerciseId: string
  before: number | null
  after: number
}

export interface SessionSummary {
  durationMin: number
  totalVolumeKg: number
  workingSets: number
  setsByMuscle: Partial<Record<Muscle, number>>
  e1rmChanges: E1rmChange[]
  records: PersonalRecord[]
}

export interface SummaryInput {
  sets: readonly WorkoutSet[]
  previousSets: readonly WorkoutSet[]
  exercisesById: ReadonlyMap<string, Exercise>
  startedAt: string
  endedAt: string
  bodyweightKg?: number
}

/** Resumen al terminar: duración, volumen, series por músculo, récords y cambios de 1RM. */
export function summarizeSession(input: SummaryInput): SessionSummary {
  const working = input.sets.filter(isWorkingSet)
  const durationMin = Math.max(
    0,
    Math.round((new Date(input.endedAt).getTime() - new Date(input.startedAt).getTime()) / 60000),
  )
  const totalVolumeKg = roundDecimals(
    working.reduce((acc, s) => acc + s.weightKg * s.reps, 0),
    1,
  )

  const setsByMuscle: Partial<Record<Muscle, number>> = {}
  for (const s of working) {
    const muscle = input.exercisesById.get(s.exerciseId)?.primaryMuscle
    if (muscle && TRACKED_MUSCLES.includes(muscle))
      setsByMuscle[muscle] = (setsByMuscle[muscle] ?? 0) + 1
  }

  const offsetFor = (exerciseId: string) =>
    input.exercisesById.get(exerciseId)?.loadType === 'bodyweight' ? (input.bodyweightKg ?? 0) : 0

  const exerciseIds = [...new Set(working.map((s) => s.exerciseId))]
  const e1rmChanges: E1rmChange[] = []
  const records: PersonalRecord[] = []
  for (const exerciseId of exerciseIds) {
    const offset = offsetFor(exerciseId)
    const now = bestE1rm(
      working.filter((s) => s.exerciseId === exerciseId),
      offset,
    )
    if (now) {
      const previousSessions = input.previousSets.filter((s) => s.exerciseId === exerciseId)
      const lastSessionId = [...previousSessions]
        .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
        .at(-1)?.sessionId
      const before = bestE1rm(
        previousSessions.filter((s) => s.sessionId === lastSessionId),
        offset,
      )
      e1rmChanges.push({ exerciseId, before: before?.e1rm ?? null, after: now.e1rm })
    }
    records.push(
      ...detectRecords(
        input.previousSets.filter((s) => s.exerciseId === exerciseId),
        working.filter((s) => s.exerciseId === exerciseId),
        offset,
      ),
    )
  }

  return {
    durationMin,
    totalVolumeKg,
    workingSets: working.length,
    setsByMuscle,
    e1rmChanges,
    records,
  }
}
