import type { MainLift, MovementPattern, Muscle } from '../types'

export type SlotRole = 'main' | 'secondary' | 'accessory'

export interface SlotTemplate {
  /** Patrones aceptados, en orden de preferencia (los siguientes son alternativas). */
  patterns: MovementPattern[]
  role: SlotRole
  mainLift?: MainLift
  /** Músculo principal preferido para el accesorio. */
  muscle?: Muscle
}

export interface SessionTemplate {
  key: string
  name: string
  focus: string
  /** Sesión de tren inferior: el HIIT se aleja de estos días. */
  isLegDay: boolean
  slots: SlotTemplate[]
}

export type SplitId = 'full-body' | 'upper-lower' | 'upper-lower-ppl' | 'ppl'

export interface SplitTemplate {
  id: SplitId
  name: string
  rationale: string
  sessions: SessionTemplate[]
}

const s = (
  patterns: MovementPattern[],
  role: SlotRole,
  extra: Omit<SlotTemplate, 'patterns' | 'role'> = {},
): SlotTemplate => ({ patterns, role, ...extra })

const FULL_BODY_A: SessionTemplate = {
  key: 'fb-a',
  name: 'Full Body A',
  focus: 'Sentadilla y press banca',
  isLegDay: true,
  slots: [
    s(['squat', 'lunge'], 'main', { mainLift: 'squat' }),
    s(['horizontal-push'], 'main', { mainLift: 'bench' }),
    s(['horizontal-pull'], 'secondary'),
    s(['hinge', 'hip-thrust'], 'secondary'),
    s(['lateral-raise'], 'accessory', { muscle: 'shoulders' }),
    s(['elbow-flexion'], 'accessory', { muscle: 'biceps' }),
    s(['core-flexion', 'core-stability'], 'accessory', { muscle: 'abs' }),
  ],
}

const FULL_BODY_B: SessionTemplate = {
  key: 'fb-b',
  name: 'Full Body B',
  focus: 'Peso muerto y press militar',
  isLegDay: true,
  slots: [
    s(['hinge', 'hip-thrust'], 'main', { mainLift: 'deadlift' }),
    s(['vertical-push'], 'main', { mainLift: 'ohp' }),
    s(['vertical-pull', 'horizontal-pull'], 'secondary', { mainLift: 'pullup' }),
    s(['lunge', 'squat'], 'secondary'),
    s(['chest-fly', 'horizontal-push'], 'accessory', { muscle: 'chest' }),
    s(['elbow-extension'], 'accessory', { muscle: 'triceps' }),
    s(['calf-raise'], 'accessory', { muscle: 'calves' }),
  ],
}

const FULL_BODY_C: SessionTemplate = {
  key: 'fb-c',
  name: 'Full Body C',
  focus: 'Remo y sentadilla variante',
  isLegDay: true,
  slots: [
    s(['horizontal-pull'], 'main', { mainLift: 'row' }),
    s(['squat', 'lunge'], 'secondary'),
    s(['horizontal-push', 'vertical-push'], 'secondary'),
    s(['knee-flexion', 'hinge'], 'accessory', { muscle: 'hamstrings' }),
    s(['rear-delt', 'lateral-raise'], 'accessory', { muscle: 'shoulders' }),
    s(['elbow-flexion'], 'accessory', { muscle: 'biceps' }),
    s(['core-stability', 'core-flexion'], 'accessory', { muscle: 'abs' }),
  ],
}

const UPPER_A: SessionTemplate = {
  key: 'upper-a',
  name: 'Torso A',
  focus: 'Press banca y remo',
  isLegDay: false,
  slots: [
    s(['horizontal-push'], 'main', { mainLift: 'bench' }),
    s(['horizontal-pull'], 'main', { mainLift: 'row' }),
    s(['vertical-push'], 'secondary'),
    s(['vertical-pull', 'horizontal-pull'], 'secondary'),
    s(['lateral-raise'], 'accessory', { muscle: 'shoulders' }),
    s(['elbow-flexion'], 'accessory', { muscle: 'biceps' }),
    s(['elbow-extension'], 'accessory', { muscle: 'triceps' }),
  ],
}

const LOWER_A: SessionTemplate = {
  key: 'lower-a',
  name: 'Pierna A',
  focus: 'Sentadilla',
  isLegDay: true,
  slots: [
    s(['squat', 'lunge'], 'main', { mainLift: 'squat' }),
    s(['hinge', 'hip-thrust'], 'secondary'),
    s(['knee-extension', 'lunge'], 'accessory', { muscle: 'quads' }),
    s(['knee-flexion'], 'accessory', { muscle: 'hamstrings' }),
    s(['calf-raise'], 'accessory', { muscle: 'calves' }),
    s(['core-flexion', 'core-stability'], 'accessory', { muscle: 'abs' }),
  ],
}

const UPPER_B: SessionTemplate = {
  key: 'upper-b',
  name: 'Torso B',
  focus: 'Press militar y dominadas',
  isLegDay: false,
  slots: [
    s(['vertical-push'], 'main', { mainLift: 'ohp' }),
    s(['vertical-pull', 'horizontal-pull'], 'main', { mainLift: 'pullup' }),
    s(['horizontal-push'], 'secondary'),
    s(['horizontal-pull'], 'secondary'),
    s(['rear-delt', 'lateral-raise'], 'accessory', { muscle: 'shoulders' }),
    s(['elbow-flexion'], 'accessory', { muscle: 'biceps' }),
    s(['elbow-extension'], 'accessory', { muscle: 'triceps' }),
  ],
}

const LOWER_B: SessionTemplate = {
  key: 'lower-b',
  name: 'Pierna B',
  focus: 'Peso muerto',
  isLegDay: true,
  slots: [
    s(['hinge', 'hip-thrust'], 'main', { mainLift: 'deadlift' }),
    s(['lunge', 'squat'], 'secondary'),
    s(['hip-thrust', 'hip-abduction'], 'accessory', { muscle: 'glutes' }),
    s(['knee-flexion'], 'accessory', { muscle: 'hamstrings' }),
    s(['calf-raise'], 'accessory', { muscle: 'calves' }),
    s(['core-stability', 'core-flexion'], 'accessory', { muscle: 'abs' }),
  ],
}

const PUSH_A: SessionTemplate = {
  key: 'push-a',
  name: 'Empuje A',
  focus: 'Press banca',
  isLegDay: false,
  slots: [
    s(['horizontal-push'], 'main', { mainLift: 'bench' }),
    s(['vertical-push'], 'secondary'),
    s(['chest-fly', 'horizontal-push'], 'accessory', { muscle: 'chest' }),
    s(['lateral-raise'], 'accessory', { muscle: 'shoulders' }),
    s(['elbow-extension'], 'accessory', { muscle: 'triceps' }),
  ],
}

const PULL_A: SessionTemplate = {
  key: 'pull-a',
  name: 'Tirón A',
  focus: 'Remo',
  isLegDay: false,
  slots: [
    s(['horizontal-pull'], 'main', { mainLift: 'row' }),
    s(['vertical-pull', 'horizontal-pull'], 'secondary'),
    s(['rear-delt', 'lateral-raise'], 'accessory', { muscle: 'shoulders' }),
    s(['elbow-flexion'], 'accessory', { muscle: 'biceps' }),
    s(['shrug', 'horizontal-pull'], 'accessory', { muscle: 'back' }),
  ],
}

const PUSH_B: SessionTemplate = {
  key: 'push-b',
  name: 'Empuje B',
  focus: 'Press militar',
  isLegDay: false,
  slots: [
    s(['vertical-push'], 'main', { mainLift: 'ohp' }),
    s(['horizontal-push'], 'secondary'),
    s(['chest-fly', 'horizontal-push'], 'accessory', { muscle: 'chest' }),
    s(['lateral-raise'], 'accessory', { muscle: 'shoulders' }),
    s(['elbow-extension'], 'accessory', { muscle: 'triceps' }),
  ],
}

const PULL_B: SessionTemplate = {
  key: 'pull-b',
  name: 'Tirón B',
  focus: 'Dominadas',
  isLegDay: false,
  slots: [
    s(['vertical-pull', 'horizontal-pull'], 'main', { mainLift: 'pullup' }),
    s(['horizontal-pull'], 'secondary'),
    s(['rear-delt', 'lateral-raise'], 'accessory', { muscle: 'shoulders' }),
    s(['elbow-flexion'], 'accessory', { muscle: 'biceps' }),
    s(['elbow-flexion'], 'accessory', { muscle: 'forearms' }),
  ],
}

export const SPLITS: Record<SplitId, SplitTemplate> = {
  'full-body': {
    id: 'full-body',
    name: 'Full Body',
    rationale:
      'Con 3 días o menos, entrenar todo el cuerpo en cada sesión permite estimular cada músculo 2–3 veces por semana.',
    sessions: [FULL_BODY_A, FULL_BODY_B, FULL_BODY_C],
  },
  'upper-lower': {
    id: 'upper-lower',
    name: 'Torso / Pierna',
    rationale:
      'Con 4 días, Torso/Pierna da frecuencia 2 por músculo, sesiones manejables y buen descanso entre básicos pesados.',
    sessions: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
  },
  'upper-lower-ppl': {
    id: 'upper-lower-ppl',
    name: 'Torso / Pierna + Empuje / Tirón / Pierna',
    rationale:
      'Con 5 días, combinar Torso/Pierna con Empuje/Tirón/Pierna reparte el volumen sin alargar las sesiones.',
    sessions: [UPPER_A, LOWER_A, PUSH_B, PULL_B, LOWER_B],
  },
  ppl: {
    id: 'ppl',
    name: 'Empuje / Tirón / Pierna × 2',
    rationale:
      'Con 6 días (solo avanzados), PPL dos veces por semana maximiza la frecuencia con sesiones cortas.',
    sessions: [PUSH_A, PULL_A, LOWER_A, PUSH_B, PULL_B, LOWER_B],
  },
}

/** Split según días por semana: 1–3 Full Body, 4 Torso/Pierna, 5 híbrido, 6 PPL. */
export function splitForDays(days: number): { split: SplitTemplate; sessions: SessionTemplate[] } {
  if (days <= 3) {
    const split = SPLITS['full-body']
    return { split, sessions: split.sessions.slice(0, Math.max(1, days)) }
  }
  const split =
    days === 4 ? SPLITS['upper-lower'] : days === 5 ? SPLITS['upper-lower-ppl'] : SPLITS.ppl
  return { split, sessions: split.sessions }
}
