import { EPLEY } from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import { fmt } from '../shared/format'
import { roundDecimals } from '../shared/math'

export interface SetLike {
  weightKg: number
  reps: number
  rir: number | null
  isWarmup: boolean
}

/** Epley: 1RM = peso × (1 + reps / 30). Con 1 rep efectiva, el 1RM es el propio peso. */
export function epley(weightKg: number, reps: number): number {
  if (reps <= 1) return roundDecimals(weightKg, 2)
  return roundDecimals(weightKg * (1 + reps / EPLEY.divisor), 2)
}

/** Peso que corresponde a `reps` con `rir` en reserva para un 1RM dado (Epley invertido). */
export function weightForReps(e1rm: number, reps: number, rir: number): number {
  const effective = reps + rir
  if (effective <= 1) return e1rm
  return roundDecimals(e1rm / (1 + effective / EPLEY.divisor), 2)
}

export interface E1rmEstimate {
  e1rm: number
  effectiveReps: number
  lowConfidence: boolean
}

/** 1RM estimado de una serie usando reps + RIR como reps efectivas. `loadOffsetKg` suma tu peso en ejercicios con peso corporal. */
export function estimateOneRepMax(
  set: Pick<SetLike, 'weightKg' | 'reps' | 'rir'>,
  loadOffsetKg = 0,
): E1rmEstimate {
  const effectiveReps = set.reps + (set.rir ?? 0)
  return {
    e1rm: epley(set.weightKg + loadOffsetKg, effectiveReps),
    effectiveReps,
    lowConfidence: effectiveReps > EPLEY.lowConfidenceAbove,
  }
}

export function isWorkingSet(set: SetLike): boolean {
  return !set.isWarmup && set.reps > 0
}

/** Mejor 1RM estimado de un conjunto de series; prioriza las de alta confianza (≤ 10 reps efectivas). */
export function bestE1rm(sets: readonly SetLike[], loadOffsetKg = 0): E1rmEstimate | null {
  const estimates = sets
    .filter(isWorkingSet)
    .filter((s) => s.weightKg + loadOffsetKg > 0)
    .map((s) => estimateOneRepMax(s, loadOffsetKg))
  if (estimates.length === 0) return null
  const confident = estimates.filter((e) => !e.lowConfidence)
  const pool = confident.length > 0 ? confident : estimates
  return pool.reduce((best, e) => (e.e1rm > best.e1rm ? e : best))
}

export function explainE1rm(
  weightKg: number,
  reps: number,
  rir: number | null,
): Calculated<number> {
  const estimate = estimateOneRepMax({ weightKg, reps, rir })
  const rirText = rir === null ? 'RIR no registrado (se toma 0)' : `RIR ${rir}`
  return calculated(estimate.e1rm, {
    title: '1RM estimado',
    summary: `Con ${fmt(weightKg, 1)} kg × ${reps} (${rirText}), tu máximo teórico a 1 repetición es ~${fmt(estimate.e1rm, 1)} kg.${estimate.lowConfidence ? ' Ojo: con más de 10 reps efectivas la estimación es de baja confianza.' : ''}`,
    formula: '1RM = peso × (1 + reps efectivas / 30); reps efectivas = reps + RIR',
    steps: [
      { label: 'Reps efectivas', value: `${reps} + ${rir ?? 0} = ${estimate.effectiveReps}` },
      {
        label: 'Cálculo',
        value: `${fmt(weightKg, 1)} × (1 + ${estimate.effectiveReps} / 30) = ${fmt(estimate.e1rm, 1)} kg`,
      },
    ],
    rationale:
      'Sumar el RIR estima lo que habrías hecho al fallo. Así comparamos sesiones con distinto esfuerzo y vemos si tu fuerza sube, se mantiene o baja.',
    reference: EPLEY.reference,
  })
}
