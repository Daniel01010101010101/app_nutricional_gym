import type {
  BodyRegion,
  Equipment,
  Exercise,
  ExerciseKind,
  LoadType,
  MovementPattern,
  Muscle,
} from '@/domain/types'
import { newId } from '@/data/defaults'
import { exerciseSchema } from '@/data/schemas'

export interface CustomExerciseInput {
  name: string
  primaryMuscle: Muscle
  pattern: MovementPattern
  loadType: LoadType
  kind: ExerciseKind
  notes: string
}

const EQUIPMENT_BY_LOAD: Record<LoadType, Equipment[]> = {
  barbell: ['barbell'],
  dumbbell: ['dumbbell'],
  stack: ['machine'],
  bodyweight: ['bodyweight'],
  fixed: ['bodyweight'],
}

const LOWER: readonly Muscle[] = ['quads', 'hamstrings', 'glutes', 'calves']

export function regionOf(muscle: Muscle): BodyRegion {
  if (LOWER.includes(muscle)) return 'lower'
  return muscle === 'abs' ? 'core' : 'upper'
}

/** Ejercicio creado por el usuario, validado con el mismo esquema que el catálogo. */
export function buildCustomExercise(input: CustomExerciseInput): Exercise {
  const name = input.name.trim()
  return exerciseSchema.parse({
    id: `custom-${newId()}`,
    name,
    nameEn: name,
    aliases: [],
    primaryMuscle: input.primaryMuscle,
    secondaryMuscles: [],
    kind: input.kind,
    equipment: EQUIPMENT_BY_LOAD[input.loadType],
    loadType: input.loadType,
    pattern: input.pattern,
    bodyRegion: regionOf(input.primaryMuscle),
    stresses: [],
    instructions: [
      input.notes.trim() ||
        'Ejercicio creado por ti. Usa un rango de movimiento completo y controla la bajada.',
    ],
    commonMistakes: ['Sacrificar la técnica por subir el peso.'],
    isCustom: true,
  })
}
