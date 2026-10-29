import { SECONDS_PER_SET, WARMUP_MINUTES, WEEKLY_VOLUME } from '../constants/formulas'
import { roundDecimals } from '../shared/math'
import { TRACKED_MUSCLES, type Exercise, type ExperienceLevel, type Muscle } from '../types'

export interface VolumeEntry {
  exerciseId: string
  sets: number
}

export type MuscleVolume = Record<Muscle, number>

export function emptyVolume(): MuscleVolume {
  return {
    chest: 0,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    quads: 0,
    hamstrings: 0,
    glutes: 0,
    calves: 0,
    abs: 0,
    forearms: 0,
    traps: 0,
  }
}

/** Series semanales por músculo: el principal cuenta 1, cada secundario 0.5. */
export function weeklyVolume(
  entries: readonly VolumeEntry[],
  exercisesById: ReadonlyMap<string, Exercise>,
): MuscleVolume {
  const volume = emptyVolume()
  for (const { exerciseId, sets } of entries) {
    const exercise = exercisesById.get(exerciseId)
    if (!exercise) continue
    volume[exercise.primaryMuscle] += sets
    for (const m of exercise.secondaryMuscles)
      volume[m] += sets * WEEKLY_VOLUME.secondaryMuscleFactor
  }
  for (const m of Object.keys(volume) as Muscle[]) volume[m] = roundDecimals(volume[m], 1)
  return volume
}

export interface VolumeTarget {
  min: number
  max: number
}

/** Rango semanal objetivo por músculo en déficit, ajustado por experiencia y prioridades. */
export function volumeTargets(
  experience: ExperienceLevel,
  priorities: readonly Muscle[],
): Record<Muscle, VolumeTarget> {
  const [min, max] = experience === 'beginner' ? WEEKLY_VOLUME.beginner : WEEKLY_VOLUME.deficit
  const targets = {} as Record<Muscle, VolumeTarget>
  for (const m of TRACKED_MUSCLES) {
    targets[m] = priorities.includes(m)
      ? { min: Math.min(max, min + WEEKLY_VOLUME.priorityBonus), max }
      : { min, max }
  }
  return targets
}

export interface TimedEntry {
  sets: number
  restSec: number
}

/** Duración estimada de una sesión en minutos (calentamiento + series + descansos). */
export function estimateSessionMinutes(entries: readonly TimedEntry[]): number {
  const seconds = entries.reduce((acc, e) => acc + e.sets * (SECONDS_PER_SET + e.restSec), 0)
  return Math.round(WARMUP_MINUTES + seconds / 60)
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Pantorrillas',
  abs: 'Abdomen',
  forearms: 'Antebrazos',
  traps: 'Trapecio',
}
