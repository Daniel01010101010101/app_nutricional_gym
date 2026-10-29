import { PRESCRIPTIONS, type Prescription } from '../constants/formulas'
import type { ExerciseKind, ExperienceLevel } from '../types'
import type { SlotRole } from './splits'

/** Series, reps, RIR y descanso por rol del ejercicio y experiencia. */
export function prescriptionFor(
  role: SlotRole,
  kind: ExerciseKind,
  experience: ExperienceLevel,
): Prescription {
  switch (role) {
    case 'main':
      return { ...PRESCRIPTIONS.main, sets: experience === 'advanced' ? 4 : 3 }
    case 'secondary':
      return { ...PRESCRIPTIONS.secondary }
    case 'accessory': {
      const base = PRESCRIPTIONS.accessory
      return {
        ...base,
        sets: experience === 'beginner' ? 2 : base.sets,
        repMin: kind === 'compound' ? 8 : base.repMin,
        repMax: kind === 'compound' ? 12 : base.repMax,
        rirMin: experience === 'beginner' ? 1 : base.rirMin,
      }
    }
  }
}

export const ROLE_LABEL: Record<SlotRole, string> = {
  main: 'Básico',
  secondary: 'Compuesto',
  accessory: 'Accesorio',
}
