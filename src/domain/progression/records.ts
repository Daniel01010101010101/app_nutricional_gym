import { roundDecimals } from '../shared/math'
import type { DayKey, WorkoutSet } from '../types'
import { bestE1rm, isWorkingSet } from './e1rm'

export type RecordType = 'max-weight' | 'reps-at-weight' | 'e1rm' | 'volume'

export interface PersonalRecord {
  exerciseId: string
  type: RecordType
  value: number
  previous: number
  weightKg?: number
  reps?: number
}

export const RECORD_LABEL: Record<RecordType, string> = {
  'max-weight': 'Peso máximo',
  'reps-at-weight': 'Más reps con este peso',
  e1rm: 'Mejor 1RM estimado',
  volume: 'Mayor volumen en una sesión',
}

type RecordSet = Pick<
  WorkoutSet,
  'exerciseId' | 'sessionId' | 'weightKg' | 'reps' | 'rir' | 'isWarmup' | 'date'
>

function sessionVolume(sets: readonly RecordSet[]): number {
  return roundDecimals(
    sets.filter(isWorkingSet).reduce((acc, s) => acc + s.weightKg * s.reps, 0),
    1,
  )
}

function volumesBySession(sets: readonly RecordSet[]): number[] {
  const bySession = new Map<string, RecordSet[]>()
  for (const s of sets) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s])
  return [...bySession.values()].map(sessionVolume)
}

const key = (w: number) => w.toFixed(2)

/**
 * Récords de la sesión frente al historial previo, por ejercicio.
 * Solo se cuentan ejercicios con historial: la primera vez es tu línea base.
 */
export function detectRecords(
  previous: readonly RecordSet[],
  session: readonly RecordSet[],
  loadOffsetKg = 0,
): PersonalRecord[] {
  const records: PersonalRecord[] = []
  const exerciseIds = [...new Set(session.filter(isWorkingSet).map((s) => s.exerciseId))]

  for (const exerciseId of exerciseIds) {
    const before = previous.filter((s) => s.exerciseId === exerciseId && isWorkingSet(s))
    if (before.length === 0) continue
    const now = session.filter((s) => s.exerciseId === exerciseId && isWorkingSet(s))

    const prevMax = Math.max(...before.map((s) => s.weightKg))
    const top = now.reduce((a, b) =>
      b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a,
    )
    if (top.weightKg > prevMax) {
      records.push({
        exerciseId,
        type: 'max-weight',
        value: top.weightKg,
        previous: prevMax,
        weightKg: top.weightKg,
        reps: top.reps,
      })
    }

    const repsByWeight = new Map<string, number>()
    for (const s of before)
      repsByWeight.set(key(s.weightKg), Math.max(repsByWeight.get(key(s.weightKg)) ?? 0, s.reps))
    let bestRepRecord: PersonalRecord | null = null
    for (const s of now) {
      const prev = repsByWeight.get(key(s.weightKg))
      if (prev === undefined || s.reps <= prev) continue
      if (!bestRepRecord || s.reps - prev > bestRepRecord.value - bestRepRecord.previous) {
        bestRepRecord = {
          exerciseId,
          type: 'reps-at-weight',
          value: s.reps,
          previous: prev,
          weightKg: s.weightKg,
          reps: s.reps,
        }
      }
    }
    if (bestRepRecord) records.push(bestRepRecord)

    const prevE1rm = bestE1rm(before, loadOffsetKg)
    const nowE1rm = bestE1rm(now, loadOffsetKg)
    if (prevE1rm && nowE1rm && nowE1rm.e1rm > prevE1rm.e1rm) {
      records.push({ exerciseId, type: 'e1rm', value: nowE1rm.e1rm, previous: prevE1rm.e1rm })
    }

    const prevVolume = Math.max(...volumesBySession(before))
    const nowVolume = sessionVolume(now)
    if (nowVolume > prevVolume && prevVolume > 0) {
      records.push({ exerciseId, type: 'volume', value: nowVolume, previous: prevVolume })
    }
  }
  return records
}

export interface ExerciseBests {
  exerciseId: string
  maxWeight: { weightKg: number; reps: number; date: DayKey } | null
  bestE1rm: { value: number; date: DayKey } | null
  bestVolume: { value: number; date: DayKey } | null
  sessions: number
}

/** Mejores marcas históricas por ejercicio (para la lista de récords). */
export function computeBests(sets: readonly RecordSet[]): ExerciseBests[] {
  const byExercise = new Map<string, RecordSet[]>()
  for (const s of sets.filter(isWorkingSet))
    byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s])

  return [...byExercise.entries()].map(([exerciseId, list]) => {
    const heaviest = list.reduce((a, b) =>
      b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a,
    )
    let bestE: ExerciseBests['bestE1rm'] = null
    for (const s of list) {
      const e = bestE1rm([s])
      if (e && !e.lowConfidence && (!bestE || e.e1rm > bestE.value))
        bestE = { value: e.e1rm, date: s.date }
    }
    const bySession = new Map<string, RecordSet[]>()
    for (const s of list) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s])
    let bestVolume: ExerciseBests['bestVolume'] = null
    for (const group of bySession.values()) {
      const volume = sessionVolume(group)
      if (volume > 0 && (!bestVolume || volume > bestVolume.value))
        bestVolume = { value: volume, date: (group[0] as RecordSet).date }
    }
    return {
      exerciseId,
      maxWeight:
        heaviest.weightKg > 0
          ? { weightKg: heaviest.weightKg, reps: heaviest.reps, date: heaviest.date }
          : null,
      bestE1rm: bestE,
      bestVolume,
      sessions: bySession.size,
    }
  })
}
