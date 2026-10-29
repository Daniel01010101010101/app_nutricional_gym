import { DELOAD } from '../constants/formulas'
import { calculated, type Calculated } from '../shared/explanation'
import { daysBetween } from '../shared/dates'
import type { DayKey } from '../types'

export interface FatigueSignals {
  strengthAlert: boolean
  /** Check-ins seguidos con sueño o energía ≤ 2. */
  lowWellbeingCheckins: number
  /** Sesiones seguidas con sensación ≤ 2. */
  lowFeelingSessions: number
}

export interface DeloadStatus {
  due: boolean
  reason: 'scheduled' | 'fatigue' | null
  weekInBlock: number
}

export function weekInBlock(blockStart: DayKey, today: DayKey): number {
  return Math.floor(Math.max(0, daysBetween(blockStart, today)) / 7) + 1
}

/** ¿Toca semana de descarga? Cada 5–8 semanas (6 por defecto) o antes si hay fatiga acumulada. */
export function deloadStatus(input: {
  blockStart: DayKey
  today: DayKey
  everyWeeks?: number
  signals: FatigueSignals
}): Calculated<DeloadStatus> {
  const every = input.everyWeeks ?? DELOAD.defaultEveryWeeks
  const week = weekInBlock(input.blockStart, input.today)
  const fatigue =
    input.signals.strengthAlert ||
    input.signals.lowWellbeingCheckins >= 2 ||
    input.signals.lowFeelingSessions >= 2
  const scheduled = week > every
  const reason = scheduled ? 'scheduled' : fatigue ? 'fatigue' : null

  const summary =
    reason === 'scheduled'
      ? `Llevas ${every} semanas de bloque: esta semana toca descarga.`
      : reason === 'fatigue'
        ? 'Hay señales de fatiga acumulada: una semana de descarga ahora te ayudará a volver más fuerte.'
        : `Semana ${week} de ${every} del bloque. Sin necesidad de descarga por ahora.`

  return calculated(
    { due: reason !== null, reason, weekInBlock: week },
    {
      title: 'Semana de descarga',
      summary,
      steps: [
        { label: 'Volumen', value: 'Reduce las series a la mitad (−40–50 %)' },
        { label: 'Intensidad', value: 'Mantén los mismos pesos' },
      ],
      rationale:
        'La descarga disipa la fatiga sin perder adaptaciones. Mantener la carga conserva la fuerza; bajar el volumen permite recuperarse.',
    },
  )
}

/** Series durante la descarga: −50 % redondeando hacia arriba (mínimo 1). */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.ceil(sets * DELOAD.volumeFactor))
}
