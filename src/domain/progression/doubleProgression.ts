import { PROGRESSION, type Prescription } from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import { fmt } from '../shared/format'
import { mean } from '../shared/math'
import { deloadSets } from '../training/deload'
import {
  nextLoadable,
  reducedLoadable,
  roundToLoadable,
  type LoadingSettings,
} from '../training/loading'
import type { BodyRegion, DayKey, LoadType } from '../types'
import { isWorkingSet, weightForReps, type SetLike } from './e1rm'

export interface SessionSets {
  date: DayKey
  sets: SetLike[]
}

export type ProgressionAction =
  'start' | 'find' | 'increase' | 'progress-reps' | 'hold' | 'reduce' | 'deload'

export interface ProgressionTarget {
  action: ProgressionAction
  /** Peso sugerido (kg). `null` si aún no hay datos para sugerir. */
  weightKg: number | null
  /** Reps objetivo por serie. */
  reps: number[]
  sets: number
  rir: [number, number]
  /** Sesiones seguidas sin el mínimo de reps con este peso. */
  misses: number
}

export interface ProgressionInput {
  prescription: Prescription
  /** Sesiones anteriores de este ejercicio en orden cronológico. */
  history: readonly SessionSets[]
  loadType: LoadType
  bodyRegion: BodyRegion
  loading: LoadingSettings
  /** 1RM estimado del test inicial, para la primera sesión. */
  baselineE1rm?: number
  deload?: boolean
}

const EPS = 0.01

interface Evaluation {
  topWeight: number
  counted: SetLike[]
  completedAll: boolean
  missed: boolean
}

function evaluate(session: SessionSets, p: Prescription): Evaluation {
  const working = session.sets.filter(isWorkingSet)
  const topWeight = Math.max(...working.map((s) => s.weightKg))
  const counted = working.slice(0, p.sets)
  const completedAll =
    counted.length >= p.sets &&
    counted.every(
      (s) =>
        s.weightKg >= topWeight - EPS &&
        s.reps >= p.repMax &&
        (s.rir === null || s.rir >= p.rirMin),
    )
  const missed = counted.some((s) => s.weightKg >= topWeight - EPS && s.reps < p.repMin)
  return { topWeight, counted, completedAll, missed }
}

function setsSummary(sets: readonly SetLike[]): string {
  return sets
    .map((s) => `${fmt(s.weightKg, 2)}×${s.reps}${s.rir !== null ? ` @${s.rir}` : ''}`)
    .join(', ')
}

/**
 * Progresión doble: con el tope de reps en todas las series al RIR objetivo, sube el peso
 * (+2.5 kg tren superior / +5 kg inferior, redondeado a tus discos). Si no llegas al mínimo:
 * 1–2 sesiones → mantener; 3 sesiones → bajar 5–10 % y reconstruir.
 */
export function suggestNextTarget(input: ProgressionInput): Calculated<ProgressionTarget> {
  const p = input.prescription
  const rir: [number, number] = [p.rirMin, p.rirMax]
  const sessions = input.history.filter((s) => s.sets.some(isWorkingSet))
  const last = sessions.at(-1)
  const rangeText = `${p.repMin}–${p.repMax} reps a RIR ${p.rirMin}–${p.rirMax}`

  if (!last) {
    const startReps = Math.min(p.repMax, p.repMin + 1)
    if (input.baselineE1rm !== undefined) {
      const weight = roundToLoadable(
        weightForReps(input.baselineE1rm, startReps, PROGRESSION.startingRir),
        input.loadType,
        input.loading,
        'down',
      )
      return calculated(
        {
          action: 'start',
          weightKg: weight,
          reps: Array<number>(p.sets).fill(startReps),
          sets: p.sets,
          rir,
          misses: 0,
        },
        {
          title: 'Peso inicial',
          summary: `Empieza con ${fmt(weight, 2)} kg × ${startReps}: sale de tu 1RM estimado (${fmt(input.baselineE1rm, 1)} kg) dejando 2 reps en reserva.`,
          formula: 'peso = 1RM / (1 + (reps + RIR) / 30), redondeado a tus discos',
          rationale:
            'Arrancar un poco por debajo de tu máximo te deja margen para progresar desde la primera semana.',
        },
      )
    }
    return calculated(
      {
        action: 'find',
        weightKg: null,
        reps: Array<number>(p.sets).fill(p.repMax),
        sets: p.sets,
        rir,
        misses: 0,
      },
      {
        title: 'Primera vez',
        summary: `Busca un peso con el que hagas ${rangeText}. Esa será tu referencia para progresar.`,
        rationale:
          'Sin historial no podemos sugerir un peso: la primera sesión sirve para calibrar.',
      },
    )
  }

  const current = evaluate(last, p)
  const lastText = `Última vez (${last.date}): ${setsSummary(current.counted)}.`

  if (input.deload) {
    const sets = deloadSets(p.sets)
    return calculated(
      {
        action: 'deload',
        weightKg: current.topWeight,
        reps: Array<number>(sets).fill(p.repMin),
        sets,
        rir: [Math.min(p.rirMax + 1, 4), Math.min(p.rirMax + 2, 4)],
        misses: 0,
      },
      {
        title: 'Semana de descarga',
        summary: `${lastText} Mantén ${fmt(current.topWeight, 2)} kg pero haz solo ${sets} series, lejos del fallo.`,
        rationale:
          'Mismo peso para conservar la fuerza, la mitad de volumen para disipar la fatiga.',
      },
    )
  }

  if (current.completedAll) {
    const increment = PROGRESSION.incrementKg[input.bodyRegion]
    const weight = nextLoadable(current.topWeight, increment, input.loadType, input.loading)
    return calculated(
      {
        action: 'increase',
        weightKg: weight,
        reps: Array<number>(p.sets).fill(p.repMin),
        sets: p.sets,
        rir,
        misses: 0,
      },
      {
        title: '¡Toca subir!',
        summary: `${lastText} Completaste ${p.repMax} reps en todas las series: sube a ${fmt(weight, 2)} kg y vuelve a ${p.repMin} reps.`,
        steps: [
          {
            label: 'Regla',
            value: `Tope del rango (${p.repMax}) en todas las series a RIR ≥ ${p.rirMin}`,
          },
          {
            label: 'Incremento',
            value: `+${fmt(increment, 1)} kg (${input.bodyRegion === 'lower' ? 'tren inferior' : 'tren superior'}), redondeado a tus discos`,
          },
        ],
        rationale:
          'Progresión doble: primero sumas reps con el mismo peso; al llegar al tope, subes el peso y vuelves al mínimo.',
      },
    )
  }

  if (current.missed) {
    let misses = 0
    for (const session of [...sessions].reverse()) {
      const e = evaluate(session, p)
      if (Math.abs(e.topWeight - current.topWeight) > EPS || !e.missed) break
      misses++
    }

    if (misses >= PROGRESSION.missesBeforeReset) {
      const shortfall = mean(current.counted.map((s) => Math.max(0, p.repMin - s.reps))) as number
      const fraction = shortfall <= 1 ? PROGRESSION.resetSmall : PROGRESSION.resetLarge
      const weight = reducedLoadable(current.topWeight, fraction, input.loadType, input.loading)
      const reps = Math.min(p.repMax, p.repMin + 1)
      return calculated(
        {
          action: 'reduce',
          weightKg: weight,
          reps: Array<number>(p.sets).fill(reps),
          sets: p.sets,
          rir,
          misses,
        },
        {
          title: 'Bajar y reconstruir',
          summary: `${lastText} Van ${misses} sesiones sin llegar a ${p.repMin} reps con ${fmt(current.topWeight, 2)} kg. Baja a ${fmt(weight, 2)} kg (−${fmt(fraction * 100)} %) y vuelve a construir.`,
          rationale:
            'Insistir con un peso que no sale acumula fatiga. Bajar un poco y reconstruir suele romper el estancamiento en 2–3 semanas.',
        },
      )
    }

    return calculated(
      {
        action: 'hold',
        weightKg: current.topWeight,
        reps: Array<number>(p.sets).fill(p.repMin),
        sets: p.sets,
        rir,
        misses,
      },
      {
        title: 'Mantén el peso',
        summary: `${lastText} No llegaste a ${p.repMin} reps en alguna serie (${misses}.ª vez). Repite ${fmt(current.topWeight, 2)} kg y busca el mínimo del rango.`,
        rationale: `Un mal día pasa. Si a la ${PROGRESSION.missesBeforeReset}.ª sesión sigue sin salir, bajaremos el peso 5–10 %.`,
      },
    )
  }

  const lastCounted = current.counted[current.counted.length - 1] as SetLike
  const reps = Array.from({ length: p.sets }, (_, i) => {
    const previous = (current.counted[i] ?? lastCounted).reps
    return Math.min(p.repMax, previous + 1)
  })
  return calculated(
    { action: 'progress-reps', weightKg: current.topWeight, reps, sets: p.sets, rir, misses: 0 },
    {
      title: 'Suma repeticiones',
      summary: `${lastText} Mismo peso (${fmt(current.topWeight, 2)} kg); intenta una rep más por serie: ${reps.join(', ')}.`,
      rationale: `Cuando llegues a ${p.repMax} reps en todas las series, subimos el peso.`,
    },
  )
}
